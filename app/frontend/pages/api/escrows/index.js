const prisma = require("../../../lib/prisma");
const { ok, err, parsePagination, lamportsToSOL } = require("../../../lib/api-helpers");

const VALID_STATUSES = new Set([
  "ACTIVE",
  "SUBMITTED",
  "COMPLETED",
  "CANCELLED",
  "REVISION_REQUESTED",
]);

export default async function handler(req, res) {
  if (req.method !== "GET") return err(res, "Method not allowed", 405);

  const { wallet, role, status } = req.query;
  const { limit, cursor } = parsePagination(req.query);

  const where = {};

  if (wallet) {
    if (role === "client") {
      where.clientWallet = wallet;
    } else if (role === "freelancer") {
      where.freelancerWallet = wallet;
    } else {
      where.OR = [{ clientWallet: wallet }, { freelancerWallet: wallet }];
    }
  }

  if (status) {
    if (!VALID_STATUSES.has(status)) return err(res, "Invalid status value");
    where.status = status;
  }

  try {
    const [escrows, total] = await Promise.all([
      prisma.escrow.findMany({
        where,
        take: limit,
        ...(cursor ? { cursor: { pda: cursor }, skip: 1 } : {}),
        orderBy: { onChainCreatedAt: "desc" },
        include: {
          client:     { select: { walletAddress: true, displayName: true, avatarUrl: true } },
          freelancer: { select: { walletAddress: true, displayName: true, avatarUrl: true } },
        },
      }),
      prisma.escrow.count({ where }),
    ]);

    const nextCursor = escrows.length === limit ? escrows[escrows.length - 1].pda : null;

    const mapped = escrows.map((e) => ({
      ...e,
      amountSOL: lamportsToSOL(e.amountLamports),
    }));

    return ok(res, { escrows: mapped, nextCursor, total });
  } catch (e) {
    console.error("GET /api/escrows error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
