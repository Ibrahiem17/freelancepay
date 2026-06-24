const prisma = require("../../../lib/prisma");
const { ok, err } = require("../../../lib/api-helpers");

export default async function handler(req, res) {
  if (req.method !== "GET") return err(res, "Method not allowed", 405);

  const { walletAddress } = req.query;

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: {
        walletAddress: true,
        displayName:   true,
        bio:           true,
        skills:        true,
        hourlyRate:    true,
        avatarUrl:     true,
        averageRating: true,
        totalReviews:  true,
        isFreelancer:  true,
        isClient:      true,
        createdAt:     true,
        _count: {
          select: {
            freelancerEscrows: { where: { status: "COMPLETED" } },
          },
        },
      },
    });

    if (!user) return err(res, "User not found", 404);

    return ok(res, {
      user: {
        walletAddress: user.walletAddress,
        displayName:   user.displayName,
        bio:           user.bio,
        skills:        user.skills,
        hourlyRate:    user.hourlyRate != null ? parseFloat(user.hourlyRate.toString()) : null,
        avatarUrl:     user.avatarUrl,
        averageRating: user.averageRating,
        totalReviews:  user.totalReviews,
        isFreelancer:  user.isFreelancer,
        isClient:      user.isClient,
        createdAt:     user.createdAt.toISOString(),
        completedJobs: user._count.freelancerEscrows,
      },
    });
  } catch (e) {
    console.error("GET /api/users/[walletAddress] error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
