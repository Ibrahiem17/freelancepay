const prisma = require("../../../../lib/prisma");
const { ok, err, requireAuth } = require("../../../../lib/api-helpers");

export default async function handler(req, res) {
  if (req.method === "GET")   return handleGet(req, res);
  if (req.method === "PATCH") return handlePatch(req, res);
  return err(res, "Method not allowed", 405);
}

// GET /api/jobs/[id]/applications — client sees all applicants for their job
async function handleGet(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const { id: jobId } = req.query;

  try {
    const job = await prisma.jobPost.findUnique({ where: { id: jobId } });
    if (!job) return err(res, "Job not found", 404);
    if (job.clientWallet !== user.wallet) return err(res, "Forbidden", 403);

    const applications = await prisma.jobApplication.findMany({
      where: { jobId },
      orderBy: { createdAt: "asc" },
      include: {
        freelancer: {
          select: { walletAddress: true, displayName: true, avatarUrl: true, skills: true, averageRating: true, totalReviews: true },
        },
      },
    });

    return ok(res, { applications });
  } catch (e) {
    console.error("GET /api/jobs/[id]/applications error:", e.message);
    return err(res, "Internal server error", 500);
  }
}

// PATCH /api/jobs/[id]/applications — client accepts or rejects an application
// Body: { appId, action: "accept" | "reject" }
async function handlePatch(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const { id: jobId } = req.query;
  const { appId, action } = req.body || {};

  if (!appId) return err(res, "appId required");
  if (action !== "accept" && action !== "reject") return err(res, "action must be accept or reject");

  try {
    const job = await prisma.jobPost.findUnique({ where: { id: jobId } });
    if (!job) return err(res, "Job not found", 404);
    if (job.clientWallet !== user.wallet) return err(res, "Forbidden", 403);

    const app = await prisma.jobApplication.findUnique({ where: { id: appId } });
    if (!app || app.jobId !== jobId) return err(res, "Application not found", 404);

    const newStatus = action === "accept" ? "ACCEPTED" : "REJECTED";
    const updated   = await prisma.jobApplication.update({
      where: { id: appId },
      data:  { status: newStatus },
      include: {
        freelancer: {
          select: { walletAddress: true, displayName: true },
        },
      },
    });

    // If accepted, mark job as FILLED and reject remaining pending applications
    if (action === "accept") {
      await prisma.$transaction([
        prisma.jobPost.update({ where: { id: jobId }, data: { status: "FILLED" } }),
        prisma.jobApplication.updateMany({
          where: { jobId, id: { not: appId }, status: "PENDING" },
          data:  { status: "REJECTED" },
        }),
      ]);
    }

    return ok(res, { application: updated });
  } catch (e) {
    console.error("PATCH /api/jobs/[id]/applications error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
