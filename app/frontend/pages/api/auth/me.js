const prisma = require("../../../lib/prisma");
const { getUserFromRequest } = require("../../../lib/auth");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const jwtPayload = await getUserFromRequest(req);
  if (!jwtPayload) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: jwtPayload.wallet },
      select: {
        id: true,
        walletAddress: true,
        displayName: true,
        bio: true,
        skills: true,
        hourlyRate: true,
        avatarUrl: true,
        isFreelancer: true,
        isClient: true,
        averageRating: true,
        totalReviews: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (err) {
    console.error("DB error in /api/auth/me:", err.message);
    return res.status(500).json({ error: "Database error" });
  }
}
