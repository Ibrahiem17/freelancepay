// Stub out Solana packages so solana-reader.js can be loaded without a real RPC
jest.mock("@coral-xyz/anchor", () => ({
  AnchorProvider: class {},
  Program: class {},
}));
jest.mock("@solana/web3.js", () => ({
  Connection: class {},
  Keypair: { generate: () => ({ publicKey: null }) },
}));

const { parseSubmission } = require("../utils/ipfs");
const { generateJWT, verifyJWT } = require("../lib/auth");
const { lamportsToSOL } = require("../lib/api-helpers");
const { parseStatus } = require("../lib/solana-reader");

// ─── parseSubmission ──────────────────────────────────────────────────────────

describe("parseSubmission", () => {
  test("parses a full JSON submission", () => {
    const raw = JSON.stringify({ note: "hello", file: "https://ipfs.io/Qm123", name: "file.pdf" });
    expect(parseSubmission(raw)).toEqual({
      note: "hello",
      file: "https://ipfs.io/Qm123",
      name: "file.pdf",
    });
  });

  test("falls back to plain text when not JSON", () => {
    expect(parseSubmission("plain text delivery note")).toEqual({
      note: "plain text delivery note",
      file: null,
      name: null,
    });
  });

  test("returns empty result for null", () => {
    expect(parseSubmission(null)).toEqual({ note: "", file: null, name: null });
  });

  test("returns empty result for empty string", () => {
    expect(parseSubmission("")).toEqual({ note: "", file: null, name: null });
  });

  test("falls back to raw string when note field is not a string", () => {
    const raw = '{"note":123}';
    expect(parseSubmission(raw)).toEqual({ note: raw, file: null, name: null });
  });

  test("handles JSON with missing file and name fields gracefully", () => {
    expect(parseSubmission('{"note":"only a note"}')).toEqual({
      note: "only a note",
      file: null,
      name: null,
    });
  });
});

// ─── JWT helpers ──────────────────────────────────────────────────────────────

describe("JWT helpers", () => {
  test("generateJWT returns a three-part JWT string", async () => {
    const token = await generateJWT({ wallet: "abc123", userId: "cuid1" });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  test("verifyJWT decodes wallet and userId from a valid token", async () => {
    const token = await generateJWT({ wallet: "abc123", userId: "cuid1" });
    const payload = await verifyJWT(token);
    expect(payload.wallet).toBe("abc123");
    expect(payload.userId).toBe("cuid1");
  });

  test("verifyJWT throws for a malformed token", async () => {
    await expect(verifyJWT("invalid.token.here")).rejects.toThrow();
  });

  test("verifyJWT throws for an empty string", async () => {
    await expect(verifyJWT("")).rejects.toThrow();
  });

  test("tokens from different secrets do not cross-verify", async () => {
    const good = await generateJWT({ wallet: "w1", userId: "u1" });
    const oldSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "different-secret-32-chars-minimum-ok";
    await expect(verifyJWT(good)).rejects.toThrow();
    process.env.JWT_SECRET = oldSecret;
  });
});

// ─── lamportsToSOL ────────────────────────────────────────────────────────────

describe("lamportsToSOL", () => {
  test("0.5 SOL", () => expect(lamportsToSOL(BigInt("500000000"))).toBe("0.5000"));
  test("1 SOL", () => expect(lamportsToSOL(BigInt("1000000000"))).toBe("1.0000"));
  test("1.5 SOL", () => expect(lamportsToSOL(BigInt("1500000000"))).toBe("1.5000"));
  test("0 SOL", () => expect(lamportsToSOL(BigInt("0"))).toBe("0.0000"));
  test("fractional lamports", () =>
    expect(lamportsToSOL(BigInt("123456789"))).toBe("0.1235"));
});

// ─── parseStatus ─────────────────────────────────────────────────────────────

describe("parseStatus", () => {
  test.each([
    [{ active: {} }, "ACTIVE"],
    [{ submitted: {} }, "SUBMITTED"],
    [{ completed: {} }, "COMPLETED"],
    [{ cancelled: {} }, "CANCELLED"],
    [{ revisionRequested: {} }, "REVISION_REQUESTED"],
  ])("maps %j → %s", (input, expected) => {
    expect(parseStatus(input)).toBe(expected);
  });

  test("throws for an unknown key", () => {
    expect(() => parseStatus({ unknown: {} })).toThrow();
  });
});
