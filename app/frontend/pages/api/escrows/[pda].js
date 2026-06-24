const { PublicKey } = require("@solana/web3.js");
const prisma = require("../../../lib/prisma");
const { ok, err, lamportsToSOL } = require("../../../lib/api-helpers");
const { getProgram, parseStatus } = require("../../../lib/solana-reader");

function parseSubmission(raw) {
  if (!raw) return { note: "", file: null, name: null };
  try {
    const parsed = JSON.parse(raw);
    return {
      note: typeof parsed.note === "string" ? parsed.note : raw,
      file: typeof parsed.file === "string" ? parsed.file : null,
      name: typeof parsed.name === "string" ? parsed.name : null,
    };
  } catch {
    return { note: raw, file: null, name: null };
  }
}

const USER_SELECT = {
  walletAddress:  true,
  displayName:    true,
  avatarUrl:      true,
  bio:            true,
  skills:         true,
  isFreelancer:   true,
  isClient:       true,
  averageRating:  true,
  totalReviews:   true,
};

export default async function handler(req, res) {
  if (req.method !== "GET") return err(res, "Method not allowed", 405);

  const { pda } = req.query;

  try {
    const dbEscrow = await prisma.escrow.findUnique({
      where: { pda },
      include: {
        client:     { select: USER_SELECT },
        freelancer: { select: USER_SELECT },
      },
    });

    if (dbEscrow) {
      const review = await prisma.review.findUnique({ where: { escrowPda: pda } });
      return ok(res, {
        escrow: {
          ...dbEscrow,
          amountSOL:      lamportsToSOL(dbEscrow.amountLamports),
          workSubmission: parseSubmission(dbEscrow.workSubmission),
        },
        client:     dbEscrow.client,
        freelancer: dbEscrow.freelancer,
        review:     review || null,
      });
    }

    // Fallback: fetch directly from Solana if not yet indexed
    let pubkey;
    try {
      pubkey = new PublicKey(pda);
    } catch {
      return err(res, "Escrow not found", 404);
    }

    let account;
    try {
      account = await getProgram().account.escrowAccount.fetch(pubkey);
    } catch {
      return err(res, "Escrow not found", 404);
    }

    const amountLamports = BigInt(account.amount.toString());
    return ok(res, {
      escrow: {
        pda,
        clientWallet:     account.client.toBase58(),
        freelancerWallet: account.freelancer.toBase58(),
        amountLamports:   amountLamports.toString(),
        amountSOL:        lamportsToSOL(amountLamports),
        title:            account.title,
        description:      account.description,
        workSubmission:   parseSubmission(account.workSubmission || null),
        revisionNote:     account.revisionNote || null,
        status:           parseStatus(account.status),
        onChainCreatedAt: new Date(Number(account.createdAt.toString()) * 1000),
        lastSyncedAt:     null,
        source:           "chain",
      },
      client:     null,
      freelancer: null,
      review:     null,
    });
  } catch (e) {
    console.error("GET /api/escrows/[pda] error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
