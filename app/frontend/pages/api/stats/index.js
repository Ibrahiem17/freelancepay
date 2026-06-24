const prisma = require("../../../lib/prisma");
const { ok, err, lamportsToSOL } = require("../../../lib/api-helpers");

let cachedStats = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function computeStats() {
  const [
    totalEscrows,
    totalCompleted,
    totalFreelancers,
    totalClients,
    totalJobPosts,
    volumeResult,
  ] = await Promise.all([
    prisma.escrow.count(),
    prisma.escrow.count({ where: { status: "COMPLETED" } }),
    prisma.user.count({ where: { isFreelancer: true } }),
    prisma.user.count({ where: { isClient: true } }),
    prisma.jobPost.count(),
    prisma.escrow.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amountLamports: true },
    }),
  ]);

  const totalLamports = volumeResult._sum.amountLamports ?? 0n;
  const totalVolumeSOL = lamportsToSOL(totalLamports);

  return { totalEscrows, totalCompleted, totalVolumeSOL, totalFreelancers, totalClients, totalJobPosts };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return err(res, "Method not allowed", 405);

  const now = Date.now();
  if (cachedStats && now - lastCacheTime < CACHE_TTL_MS) {
    return ok(res, cachedStats);
  }

  try {
    cachedStats = await computeStats();
    lastCacheTime = now;
    return ok(res, cachedStats);
  } catch (e) {
    console.error("GET /api/stats error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
