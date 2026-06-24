const prisma = require("../../../lib/prisma");
const { ok, err, requireAuth } = require("../../../lib/api-helpers");

export default async function handler(req, res) {
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const result = await prisma.notification.updateMany({
      where: { recipientWallet: user.wallet, read: false },
      data: { read: true },
    });

    return ok(res, { updated: result.count });
  } catch (e) {
    console.error("POST /api/notifications/read-all error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
