const prisma = require("../../../lib/prisma");
const { ok, err } = require("../../../lib/api-helpers");

export default async function handler(req, res) {
  if (req.method !== "GET") return err(res, "Method not allowed", 405);

  const { walletAddress } = req.query;
  const limit  = Math.min(Math.max(parseInt(req.query.limit)  || 10, 1), 50);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  try {
    const [reviews, total, agg, dist] = await Promise.all([
      prisma.review.findMany({
        where:   { freelancerWallet: walletAddress },
        orderBy: { createdAt: "desc" },
        take:    limit,
        skip:    offset,
      }),
      prisma.review.count({ where: { freelancerWallet: walletAddress } }),
      prisma.review.aggregate({
        where:  { freelancerWallet: walletAddress },
        _avg:   { rating: true },
        _count: true,
      }),
      prisma.review.groupBy({
        by:     ["rating"],
        where:  { freelancerWallet: walletAddress },
        _count: { rating: true },
      }),
    ]);

    // Attach client profile to each review
    const clientWallets = [...new Set(reviews.map((r) => r.clientWallet))];
    const clients = clientWallets.length > 0
      ? await prisma.user.findMany({
          where:  { walletAddress: { in: clientWallets } },
          select: { walletAddress: true, displayName: true, avatarUrl: true },
        })
      : [];
    const clientMap = Object.fromEntries(clients.map((c) => [c.walletAddress, c]));

    // Star distribution {1:0, 2:0, 3:0, 4:0, 5:0}
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    dist.forEach((d) => { distribution[d.rating] = d._count.rating; });

    const enriched = reviews.map((r) => ({
      ...r,
      client: clientMap[r.clientWallet] || { walletAddress: r.clientWallet, displayName: null, avatarUrl: null },
    }));

    return ok(res, {
      reviews:       enriched,
      total,
      hasMore:       offset + limit < total,
      averageRating: agg._avg.rating != null ? Math.round(agg._avg.rating * 100) / 100 : null,
      totalReviews:  agg._count,
      distribution,
    });
  } catch (e) {
    console.error("GET /api/reviews error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
