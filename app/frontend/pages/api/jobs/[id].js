const prisma = require("../../../lib/prisma");
const { ok, err, requireAuth } = require("../../../lib/api-helpers");

const VALID_STATUSES = new Set(["OPEN", "FILLED", "CLOSED"]);

function jobOut(j) {
  return { ...j, budgetSOL: parseFloat(j.budgetSOL.toString()) };
}

export default async function handler(req, res) {
  const { id } = req.query;
  if (req.method === "GET")    return handleGet(req, res, id);
  if (req.method === "PATCH")  return handlePatch(req, res, id);
  if (req.method === "DELETE") return handleDelete(req, res, id);
  return err(res, "Method not allowed", 405);
}

// ── GET /api/jobs/[id] ────────────────────────────────────────────────────────

async function handleGet(req, res, id) {
  try {
    const job = await prisma.jobPost.findUnique({
      where: { id },
      include: {
        client: {
          select: { walletAddress: true, displayName: true, avatarUrl: true, bio: true },
        },
      },
    });
    if (!job) return err(res, "Job not found", 404);
    return ok(res, { job: jobOut(job) });
  } catch (e) {
    console.error("GET /api/jobs/[id] error:", e.message);
    return err(res, "Internal server error", 500);
  }
}

// ── PATCH /api/jobs/[id] ──────────────────────────────────────────────────────

async function handlePatch(req, res, id) {
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const existing = await prisma.jobPost.findUnique({ where: { id } });
    if (!existing) return err(res, "Job not found", 404);
    if (existing.clientWallet !== user.wallet) return err(res, "Forbidden", 403);

    const { title, description, budgetSOL, requiredSkills, status, expiresAt } = req.body || {};
    const data = {};

    if (title !== undefined) {
      if (title.length < 5 || title.length > 100)
        return err(res, "Title must be 5–100 characters");
      data.title = title.trim();
    }
    if (description !== undefined) {
      if (description.length < 20 || description.length > 2000)
        return err(res, "Description must be 20–2000 characters");
      data.description = description.trim();
    }
    if (budgetSOL !== undefined) {
      if (parseFloat(budgetSOL) <= 0) return err(res, "Budget must be greater than 0");
      data.budgetSOL = parseFloat(budgetSOL);
    }
    if (requiredSkills !== undefined) {
      if (!Array.isArray(requiredSkills) || requiredSkills.length > 20)
        return err(res, "Maximum 20 skills");
      data.requiredSkills = requiredSkills
        .map((s) => String(s).trim().toLowerCase())
        .filter(Boolean);
    }
    if (status !== undefined) {
      if (!VALID_STATUSES.has(status)) return err(res, "Invalid status");
      data.status = status;
    }
    if (expiresAt !== undefined) {
      data.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    const updated = await prisma.jobPost.update({ where: { id }, data });
    return ok(res, { job: jobOut(updated) });
  } catch (e) {
    console.error("PATCH /api/jobs/[id] error:", e.message);
    return err(res, "Internal server error", 500);
  }
}

// ── DELETE /api/jobs/[id] — soft delete via status = CLOSED ──────────────────

async function handleDelete(req, res, id) {
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const existing = await prisma.jobPost.findUnique({ where: { id } });
    if (!existing) return err(res, "Job not found", 404);
    if (existing.clientWallet !== user.wallet) return err(res, "Forbidden", 403);

    const updated = await prisma.jobPost.update({
      where: { id },
      data:  { status: "CLOSED" },
    });
    return ok(res, { job: jobOut(updated) });
  } catch (e) {
    console.error("DELETE /api/jobs/[id] error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
