const prisma = require("../../../lib/prisma");
const { ok, err, requireAuth } = require("../../../lib/api-helpers");

export default async function handler(req, res) {
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  const user = await requireAuth(req, res);
  if (!user) return;

  const { escrowPda, rating, comment } = req.body || {};

  if (!escrowPda || rating === undefined || rating === null || !comment)
    return err(res, "escrowPda, rating, and comment are required");

  const ratingInt = parseInt(rating, 10);
  if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5)
    return err(res, "Rating must be an integer between 1 and 5");

  const trimmed = String(comment).trim();
  if (trimmed.length < 10 || trimmed.length > 500)
    return err(res, "Comment must be 10–500 characters");

  try {
    const escrow = await prisma.escrow.findUnique({ where: { pda: escrowPda } });
    if (!escrow)                              return err(res, "Escrow not found", 404);
    if (escrow.clientWallet !== user.wallet)  return err(res, "Only the client can leave a review", 403);
    if (escrow.status !== "COMPLETED")        return err(res, "Can only review a completed contract", 400);

    const existing = await prisma.review.findUnique({ where: { escrowPda } });
    if (existing) return err(res, "A review already exists for this contract", 409);

    const review = await prisma.$transaction(async (tx) => {
      const r = await tx.review.create({
        data: {
          escrowPda,
          clientWallet:     escrow.clientWallet,
          freelancerWallet: escrow.freelancerWallet,
          rating:           ratingInt,
          comment:          trimmed,
        },
      });

      const agg = await tx.review.aggregate({
        where:  { freelancerWallet: escrow.freelancerWallet },
        _avg:   { rating: true },
        _count: true,
      });

      await tx.user.update({
        where: { walletAddress: escrow.freelancerWallet },
        data: {
          averageRating: agg._avg.rating != null ? Math.round(agg._avg.rating * 100) / 100 : null,
          totalReviews:  agg._count,
        },
      });

      return r;
    });

    return ok(res, { review }, 201);
  } catch (e) {
    if (e.code === "P2002") return err(res, "A review already exists for this contract", 409);
    console.error("POST /api/reviews error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
