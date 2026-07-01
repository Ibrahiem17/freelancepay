const prisma = require("../../lib/prisma");

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

  try {
    const [freelancerRows, jobRows, escrowCount, completedCount, freelancerCount, volumeRow] =
      await Promise.all([
        prisma.user.findMany({
          where:   { isFreelancer: true },
          orderBy: [
            { averageRating: { sort: "desc", nulls: "last" } },
            { createdAt: "desc" },
          ],
          take:   3,
          select: {
            walletAddress: true,
            displayName:   true,
            skills:        true,
            hourlyRate:    true,
            avatarUrl:     true,
            averageRating: true,
            totalReviews:  true,
          },
        }),
        prisma.jobPost.findMany({
          where:   { status: "OPEN" },
          orderBy: { createdAt: "desc" },
          take:    3,
          include: {
            client: {
              select: { walletAddress: true, displayName: true, avatarUrl: true },
            },
          },
        }),
        prisma.escrow.count(),
        prisma.escrow.count({ where: { status: "COMPLETED" } }),
        prisma.user.count({ where: { isFreelancer: true } }),
        prisma.escrow.aggregate({
          where: { status: "COMPLETED" },
          _sum:  { amountLamports: true },
        }),
      ]);

    const featuredFreelancers = freelancerRows.map((u) => ({
      walletAddress: u.walletAddress,
      displayName:   u.displayName,
      skills:        u.skills,
      hourlyRate:    u.hourlyRate != null ? parseFloat(u.hourlyRate.toString()) : null,
      avatarUrl:     u.avatarUrl,
      averageRating: u.averageRating,
      totalReviews:  u.totalReviews,
    }));

    const latestJobs = jobRows.map((j) => ({
      id:             j.id,
      title:          j.title,
      description:    j.description,
      budgetSOL:      parseFloat(j.budgetSOL.toString()),
      requiredSkills: j.requiredSkills,
      createdAt:      j.createdAt.toISOString(),
      client: {
        walletAddress: j.client.walletAddress,
        displayName:   j.client.displayName,
        avatarUrl:     j.client.avatarUrl,
      },
    }));

    const lamports    = volumeRow._sum.amountLamports ?? 0n;
    const volumeSOL   = (Number(lamports) / 1_000_000_000).toFixed(2);

    const platformStats = {
      freelancers:    freelancerCount > 0 ? `${freelancerCount}+` : "4M+",
      freelancersRaw: freelancerCount,
      volume:         `${volumeSOL} SOL`,
      completed:      completedCount,
      total:          escrowCount,
    };

    return res.status(200).json({ featuredFreelancers, latestJobs, platformStats });
  } catch (e) {
    console.error("GET /api/home-data error:", e.message);
    return res.status(200).json({
      featuredFreelancers: [],
      latestJobs:          [],
      platformStats:       {},
    });
  }
}
