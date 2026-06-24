const prisma = require("../../../../lib/prisma");
const { ok, err, lamportsToSOL } = require("../../../../lib/api-helpers");

export default async function handler(req, res) {
  if (req.method !== "GET") return err(res, "Method not allowed", 405);

  const { walletAddress } = req.query;

  try {
    const escrows = await prisma.escrow.findMany({
      where: { OR: [{ clientWallet: walletAddress }, { freelancerWallet: walletAddress }] },
      orderBy: { onChainCreatedAt: "desc" },
      include: {
        client:     { select: { walletAddress: true, displayName: true, avatarUrl: true } },
        freelancer: { select: { walletAddress: true, displayName: true, avatarUrl: true } },
      },
    });

    const asClient     = escrows.filter((e) => e.clientWallet === walletAddress);
    const asFreelancer = escrows.filter((e) => e.freelancerWallet === walletAddress);

    const sumCompleted = (list) =>
      list
        .filter((e) => e.status === "COMPLETED")
        .reduce((sum, e) => sum + e.amountLamports, 0n);

    const totalEarnedSOL      = lamportsToSOL(sumCompleted(asFreelancer));
    const totalSpentSOL       = lamportsToSOL(sumCompleted(asClient));
    const activeCount         = escrows.filter((e) => e.status === "ACTIVE").length;
    const pendingPaymentCount = asFreelancer.filter((e) => e.status === "SUBMITTED").length;

    const mapEscrows = (list) =>
      list.map((e) => ({ ...e, amountSOL: lamportsToSOL(e.amountLamports) }));

    return ok(res, {
      asClient:     mapEscrows(asClient),
      asFreelancer: mapEscrows(asFreelancer),
      stats: { totalEarnedSOL, totalSpentSOL, activeCount, pendingPaymentCount },
    });
  } catch (e) {
    console.error(`GET /api/users/${walletAddress}/escrows error:`, e.message);
    return err(res, "Internal server error", 500);
  }
}
