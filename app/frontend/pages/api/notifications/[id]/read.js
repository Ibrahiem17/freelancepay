const prisma = require("../../../../lib/prisma");
const { ok, err, requireAuth } = require("../../../../lib/api-helpers");

export default async function handler(req, res) {
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  const user = await requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;

  try {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return err(res, "Notification not found", 404);
    if (notification.recipientWallet !== user.wallet) return err(res, "Forbidden", 403);

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return ok(res, { notification: updated });
  } catch (e) {
    console.error("POST /api/notifications/[id]/read error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
