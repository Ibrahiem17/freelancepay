const prisma = require("../../../lib/prisma");
const { ok, err } = require("../../../lib/api-helpers");

export default async function handler(req, res) {
  if (req.method !== "GET") return err(res, "Method not allowed", 405);

  const { q, skills, sortBy = "rating", minRate, maxRate } = req.query;
  const limit  = Math.min(Math.max(parseInt(req.query.limit)  || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  // ── Build WHERE ────────────────────────────────────────────────────────────
  const where = { isFreelancer: true };

  if (q?.trim()) {
    where.OR = [
      { displayName: { contains: q.trim(), mode: "insensitive" } },
      { bio:         { contains: q.trim(), mode: "insensitive" } },
    ];
  }

  if (skills) {
    const skillsArr = skills.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (skillsArr.length > 0) where.skills = { hasSome: skillsArr };
  }

  if (minRate || maxRate) {
    where.hourlyRate = {};
    if (minRate) where.hourlyRate.gte = parseFloat(minRate);
    if (maxRate) where.hourlyRate.lte = parseFloat(maxRate);
  }

  // ── Build ORDER ────────────────────────────────────────────────────────────
  let orderBy;
  switch (sortBy) {
    case "earnings":
      orderBy = [{ freelancerEscrows: { _count: "desc" } }, { createdAt: "desc" }];
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    default: // "rating"
      orderBy = [
        { averageRating: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ];
  }

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take:  limit,
        skip:  offset,
        orderBy,
        select: {
          walletAddress: true,
          displayName:   true,
          bio:           true,
          skills:        true,
          hourlyRate:    true,
          avatarUrl:     true,
          averageRating: true,
          totalReviews:  true,
          _count: {
            select: {
              freelancerEscrows: { where: { status: "COMPLETED" } },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const freelancers = users.map((u) => ({
      walletAddress: u.walletAddress,
      displayName:   u.displayName,
      bio:           u.bio,
      skills:        u.skills,
      hourlyRate:    u.hourlyRate != null ? parseFloat(u.hourlyRate.toString()) : null,
      avatarUrl:     u.avatarUrl,
      averageRating: u.averageRating,
      totalReviews:  u.totalReviews,
      completedJobs: u._count.freelancerEscrows,
    }));

    return ok(res, { freelancers, total, hasMore: offset + limit < total });
  } catch (e) {
    console.error("GET /api/search/freelancers error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
