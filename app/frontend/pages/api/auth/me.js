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

  const { isClient, isFreelancer, displayName, bio, skills, hourlyRate, avatarUrl } = req.body || {};
  const data = {};

  if (typeof isClient    === "boolean") data.isClient    = isClient;
  if (typeof isFreelancer === "boolean") data.isFreelancer = isFreelancer;

  if (displayName !== undefined) {
    if (displayName !== null && typeof displayName !== "string")
      return res.status(400).json({ error: "displayName must be a string or null" });
    data.displayName = displayName ? displayName.trim().slice(0, 50) || null : null;
  }
  if (bio !== undefined) {
    if (bio !== null && typeof bio !== "string")
      return res.status(400).json({ error: "bio must be a string or null" });
    data.bio = bio ? bio.trim().slice(0, 500) || null : null;
  }
  if (skills !== undefined) {
    if (!Array.isArray(skills))
      return res.status(400).json({ error: "skills must be an array" });
    data.skills = skills.map((s) => String(s).trim().toLowerCase()).filter(Boolean).slice(0, 20);
  }
  if (hourlyRate !== undefined) {
    if (hourlyRate === null) {
      data.hourlyRate = null;
    } else {
      const rate = parseFloat(hourlyRate);
      if (isNaN(rate) || rate < 0)
        return res.status(400).json({ error: "hourlyRate must be a non-negative number" });
      data.hourlyRate = rate;
    }
  }
  if (avatarUrl !== undefined) {
    if (avatarUrl !== null && typeof avatarUrl !== "string")
      return res.status(400).json({ error: "avatarUrl must be a string or null" });
    data.avatarUrl = avatarUrl ? avatarUrl.trim().slice(0, 500) : null;
  }

  if (Object.keys(data).length === 0)
    return res.status(400).json({ error: "No valid fields to update" });

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
