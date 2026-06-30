const prisma = require("../../../../lib/prisma");
const { ok, err, requireAuth } = require("../../../../lib/api-helpers");

export default async function handler(req, res) {
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  const user = await requireAuth(req, res);
  if (!user) return;

  const { id: jobId } = req.query;
  const { proposal } = req.body || {};

  if (!proposal || proposal.trim().length < 10 || proposal.trim().length > 1000)
    return err(res, "Proposal must be 10–1000 characters");

  try {
    const job = await prisma.jobPost.findUnique({ where: { id: jobId } });
    if (!job) return err(res, "Job not found", 404);
    if (job.status !== "OPEN") return err(res, "This job is no longer accepting applications");
    if (job.clientWallet === user.wallet) return err(res, "You cannot apply to your own job");

    const application = await prisma.jobApplication.upsert({
      where: { jobId_freelancerWallet: { jobId, freelancerWallet: user.wallet } },
      create: { jobId, freelancerWallet: user.wallet, proposal: proposal.trim() },
      update: { proposal: proposal.trim(), status: "PENDING" },
    });

    return ok(res, { application }, 201);
  } catch (e) {
    console.error("POST /api/jobs/[id]/apply error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
