const prisma = require("../../../lib/prisma");
const { getUserFromRequest } = require("../../../lib/auth");

const USER_SELECT = {
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
};

export default async function handler(req, res) {
  if (req.method === "GET")   return handleGet(req, res);
  if (req.method === "PATCH") return handlePatch(req, res);
  return res.status(405).json({ error: "Method not allowed" });
}

async function handleGet(req, res) {
  const jwtPayload = await getUserFromRequest(req);
  if (!jwtPayload) return res.status(401).json({ error: "Not authenticated" });

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: jwtPayload.wallet },
      select: USER_SELECT,
    });
    if (!user) return res.status(401).json({ error: "User not found" });
    return res.status(200).json({ user });
  } catch (err) {
    console.error("DB error in GET /api/auth/me:", err.message);
    return res.status(500).json({ error: "Database error" });
  }
}

async function handlePatch(req, res) {
  const jwtPayload = await getUserFromRequest(req);
  if (!jwtPayload) return res.status(401).json({ error: "Not authenticated" });

  const { isClient, isFreelancer } = req.body || {};
  const data = {};
  if (typeof isClient    === "boolean") data.isClient    = isClient;
  if (typeof isFreelancer === "boolean") data.isFreelancer = isFreelancer;

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    const user = await prisma.user.update({
      where: { walletAddress: jwtPayload.wallet },
      data,
      select: USER_SELECT,
    });
    return res.status(200).json({ user });
  } catch (err) {
    console.error("DB error in PATCH /api/auth/me:", err.message);
    return res.status(500).json({ error: "Database error" });
  }
}
