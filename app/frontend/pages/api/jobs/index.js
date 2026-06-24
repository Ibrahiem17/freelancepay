const prisma = require("../../../lib/prisma");
const { ok, err, requireAuth } = require("../../../lib/api-helpers");

const VALID_STATUSES = new Set(["OPEN", "FILLED", "CLOSED"]);

function jobOut(j) {
  return { ...j, budgetSOL: parseFloat(j.budgetSOL.toString()) };
}

export default async function handler(req, res) {
  if (req.method === "GET")  return handleGet(req, res);
  if (req.method === "POST") return handlePost(req, res);
  return err(res, "Method not allowed", 405);
}

// ── GET /api/jobs ─────────────────────────────────────────────────────────────

async function handleGet(req, res) {
  const { q, skills, minBudget, maxBudget, status = "OPEN" } = req.query;
  const limit  = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const cursor = req.query.cursor || undefined;

  if (!VALID_STATUSES.has(status)) return err(res, "Invalid status");

  const where = { status };

  if (q?.trim()) {
    where.OR = [
      { title:       { contains: q.trim(), mode: "insensitive" } },
      { description: { contains: q.trim(), mode: "insensitive" } },
    ];
  }

  if (skills) {
    const arr = skills.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (arr.length > 0) where.requiredSkills = { hasSome: arr };
  }

  if (minBudget || maxBudget) {
    where.budgetSOL = {};
    if (minBudget) where.budgetSOL.gte = parseFloat(minBudget);
    if (maxBudget) where.budgetSOL.lte = parseFloat(maxBudget);
  }

  try {
    const [jobs, total] = await Promise.all([
      prisma.jobPost.findMany({
        where,
        take: limit,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: { walletAddress: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      prisma.jobPost.count({ where }),
    ]);

    const nextCursor = jobs.length === limit ? jobs[jobs.length - 1].id : null;
    return ok(res, { jobs: jobs.map(jobOut), nextCursor, total });
  } catch (e) {
    console.error("GET /api/jobs error:", e.message);
    return err(res, "Internal server error", 500);
  }
}

// ── POST /api/jobs ────────────────────────────────────────────────────────────

async function handlePost(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const dbUser = await prisma.user.findUnique({
    where:  { walletAddress: user.wallet },
    select: { isClient: true },
  });
  if (!dbUser?.isClient) return err(res, "Only clients can post jobs", 403);

  const { title, description, budgetSOL, requiredSkills = [], expiresAt } = req.body || {};

  if (!title || title.length < 5 || title.length > 100)
    return err(res, "Title must be 5–100 characters");
  if (!description || description.length < 20 || description.length > 2000)
    return err(res, "Description must be 20–2000 characters");
  if (!budgetSOL || parseFloat(budgetSOL) <= 0)
    return err(res, "Budget must be greater than 0");
  if (!Array.isArray(requiredSkills) || requiredSkills.length > 20)
    return err(res, "Maximum 20 skills allowed");

  const skills = requiredSkills
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean);

  try {
    const job = await prisma.jobPost.create({
      data: {
        clientWallet:   user.wallet,
        title:          title.trim(),
        description:    description.trim(),
        budgetSOL:      parseFloat(budgetSOL),
        requiredSkills: skills,
        ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
      },
    });
    return ok(res, { job: jobOut(job) }, 201);
  } catch (e) {
    console.error("POST /api/jobs error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
