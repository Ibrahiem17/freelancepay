const prisma = require("../../../lib/prisma");
const { ok, err, requireAuth } = require("../../../lib/api-helpers");

export default async function handler(req, res) {
  if (req.method !== "GET") return err(res, "Method not allowed", 405);

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const notifications = await prisma.notification.findMany({
      where: { recipientWallet: user.wallet },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    return ok(res, { notifications, unreadCount });
  } catch (e) {
    console.error("GET /api/notifications error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
