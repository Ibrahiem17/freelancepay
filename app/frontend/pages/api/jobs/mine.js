const prisma = require("../../../lib/prisma");
const { ok, err, requireAuth } = require("../../../lib/api-helpers");

// GET /api/jobs/mine — returns the authenticated client's posted jobs with application counts
export default async function handler(req, res) {
  if (req.method !== "GET") return err(res, "Method not allowed", 405);

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const jobs = await prisma.jobPost.findMany({
      where: { clientWallet: user.wallet },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { applications: true } },
        applications: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "asc" },
          include: {
            freelancer: {
              select: { walletAddress: true, displayName: true, avatarUrl: true, skills: true, averageRating: true },
            },
          },
        },
      },
    });

    return ok(res, {
      jobs: jobs.map((j) => ({
        ...j,
        budgetSOL: parseFloat(j.budgetSOL.toString()),
        totalApplications: j._count.applications,
      })),
    });
  } catch (e) {
    console.error("GET /api/jobs/mine error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
