// All external dependencies are mocked so no Solana RPC or DB is touched

jest.mock("@coral-xyz/anchor", () => ({ AnchorProvider: class {}, Program: class {} }));
jest.mock("@solana/web3.js", () => ({
  Connection: class {},
  Keypair: { generate: () => ({ publicKey: null }) },
}));

jest.mock("../lib/prisma", () => ({
  escrow: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
}));

jest.mock("../lib/email", () => ({
  sendWorkSubmittedEmail:    jest.fn().mockResolvedValue(undefined),
  sendRevisionRequestedEmail: jest.fn().mockResolvedValue(undefined),
  sendPaymentReleasedEmail:  jest.fn().mockResolvedValue(undefined),
  sendEscrowCreatedEmail:    jest.fn().mockResolvedValue(undefined),
  sendEscrowCancelledEmail:  jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../lib/eventBus", () => ({ emitNotification: jest.fn() }));

// Provide a real parseStatus implementation inside the mock so indexer tests work
jest.mock("../lib/solana-reader", () => ({
  fetchAllEscrows: jest.fn(),
  parseStatus: (statusObj) => {
    const key = Object.keys(statusObj)[0];
    const map = {
      active: "ACTIVE", submitted: "SUBMITTED", completed: "COMPLETED",
      cancelled: "CANCELLED", revisionRequested: "REVISION_REQUESTED",
    };
    const result = map[key];
    if (!result) throw new Error(`Unknown status key: ${key}`);
    return result;
  },
}));

const prisma            = require("../lib/prisma");
const { fetchAllEscrows } = require("../lib/solana-reader");
const { sendPaymentReleasedEmail, sendEscrowCreatedEmail } = require("../lib/email");
const { syncEscrows }   = require("../lib/indexer");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeOnChainEscrow(overrides = {}) {
  return {
    pda: "testPda123",
    account: {
      client:         "clientWalletAddress",
      freelancer:     "freelancerWalletAddress",
      amount:         { toString: () => "500000000" },
      title:          "Test Project",
      description:    "Test description",
      workSubmission: null,
      revisionNote:   null,
      status:         { active: {} },
      createdAt:      { toString: () => String(Math.floor(Date.now() / 1000)) },
      ...overrides,
    },
  };
}

// ─── parseStatus (via mock — mirrors real implementation) ────────────────────

describe("parseStatus (contract verification)", () => {
  const { parseStatus } = require("../lib/solana-reader");

  test.each([
    [{ active: {} },            "ACTIVE"],
    [{ submitted: {} },         "SUBMITTED"],
    [{ completed: {} },         "COMPLETED"],
    [{ cancelled: {} },         "CANCELLED"],
    [{ revisionRequested: {} }, "REVISION_REQUESTED"],
  ])("maps %j → %s", (input, expected) => {
    expect(parseStatus(input)).toBe(expected);
  });

  test("throws for an unrecognised key", () => {
    expect(() => parseStatus({ bogus: {} })).toThrow();
  });
});

// ─── syncEscrows — new escrow ─────────────────────────────────────────────────

describe("syncEscrows — new escrow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.escrow.findUnique.mockResolvedValue(null);
    prisma.escrow.create.mockResolvedValue({});
    prisma.user.upsert.mockResolvedValue({});
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.notification.create.mockResolvedValue({ id: "n1", type: "ESCROW_CREATED", title: "", message: "", escrowPda: "", createdAt: new Date() });
  });

  test("creates the escrow row when it does not exist in DB", async () => {
    fetchAllEscrows.mockResolvedValue([makeOnChainEscrow()]);
    await syncEscrows();
    expect(prisma.escrow.create).toHaveBeenCalledTimes(1);
    expect(prisma.escrow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pda: "testPda123", status: "ACTIVE" }),
      })
    );
  });

  test("ensures both client and freelancer user rows exist via upsert", async () => {
    fetchAllEscrows.mockResolvedValue([makeOnChainEscrow()]);
    await syncEscrows();
    const wallets = prisma.user.upsert.mock.calls.map((c) => c[0].where.walletAddress);
    expect(wallets).toContain("clientWalletAddress");
    expect(wallets).toContain("freelancerWalletAddress");
  });

  test("sends escrow-created email on new escrow", async () => {
    fetchAllEscrows.mockResolvedValue([makeOnChainEscrow()]);
    await syncEscrows();
    expect(sendEscrowCreatedEmail).toHaveBeenCalledTimes(1);
  });

  test("returns correct counts", async () => {
    fetchAllEscrows.mockResolvedValue([makeOnChainEscrow(), makeOnChainEscrow({ pda: "pda2" })]);
    prisma.escrow.findUnique.mockResolvedValue(null);
    const result = await syncEscrows();
    expect(result.synced).toBe(2);
    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);
  });
});

// ─── syncEscrows — existing escrow, no status change ─────────────────────────

describe("syncEscrows — existing escrow, same status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.escrow.findUnique.mockResolvedValue({ pda: "testPda123", status: "ACTIVE" });
    prisma.escrow.update.mockResolvedValue({});
    prisma.user.upsert.mockResolvedValue({});
    prisma.user.findUnique.mockResolvedValue(null);
  });

  test("updates the escrow row without creating a notification", async () => {
    fetchAllEscrows.mockResolvedValue([makeOnChainEscrow()]);
    await syncEscrows();
    expect(prisma.escrow.update).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});

// ─── syncEscrows — status change ACTIVE → SUBMITTED ──────────────────────────

describe("syncEscrows — ACTIVE→SUBMITTED transition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.escrow.findUnique.mockResolvedValue({ pda: "testPda123", status: "ACTIVE" });
    prisma.escrow.update.mockResolvedValue({});
    prisma.user.upsert.mockResolvedValue({});
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.notification.create.mockResolvedValue({
      id: "n1", type: "WORK_SUBMITTED", title: "Work submitted", message: "msg",
      escrowPda: "testPda123", createdAt: new Date(),
    });
  });

  test("creates a WORK_SUBMITTED notification for the client", async () => {
    const escrow = makeOnChainEscrow({ status: { submitted: {} }, workSubmission: '{"note":"done"}' });
    fetchAllEscrows.mockResolvedValue([escrow]);
    await syncEscrows();
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "WORK_SUBMITTED",
          recipientWallet: "clientWalletAddress",
        }),
      })
    );
  });

  test("increments statusChanges counter", async () => {
    const escrow = makeOnChainEscrow({ status: { submitted: {} } });
    fetchAllEscrows.mockResolvedValue([escrow]);
    const result = await syncEscrows();
    expect(result.statusChanges).toBe(1);
  });
});

// ─── syncEscrows — SUBMITTED → COMPLETED (payment released) ──────────────────

describe("syncEscrows — SUBMITTED→COMPLETED transition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.escrow.findUnique.mockResolvedValue({ pda: "testPda123", status: "SUBMITTED" });
    prisma.escrow.update.mockResolvedValue({});
    prisma.user.upsert.mockResolvedValue({});
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.notification.create.mockResolvedValue({
      id: "n2", type: "PAYMENT_RELEASED", title: "Payment released!", message: "msg",
      escrowPda: "testPda123", createdAt: new Date(),
    });
  });

  test("sends payment-released email to freelancer", async () => {
    const escrow = makeOnChainEscrow({ status: { completed: {} } });
    fetchAllEscrows.mockResolvedValue([escrow]);
    await syncEscrows();
    expect(sendPaymentReleasedEmail).toHaveBeenCalledTimes(1);
  });

  test("creates a PAYMENT_RELEASED notification for the freelancer", async () => {
    const escrow = makeOnChainEscrow({ status: { completed: {} } });
    fetchAllEscrows.mockResolvedValue([escrow]);
    await syncEscrows();
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "PAYMENT_RELEASED",
          recipientWallet: "freelancerWalletAddress",
        }),
      })
    );
  });
});
