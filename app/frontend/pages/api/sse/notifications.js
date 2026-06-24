// Server-Sent Events endpoint — pushes notifications to authenticated clients in real time.
//
// Production note: EventEmitter works only when the SSE connection and the indexer cron
// run in the same Node.js process instance. On Vercel/serverless, each invocation is
// isolated, so the emitNotification call from the cron function won't reach SSE handlers
// in other function instances. For production at scale, replace EventEmitter with
// Pusher (pusher.com) or Upstash Redis Pub/Sub using the same emitNotification interface.
// For local development and small-scale deployments this approach works correctly.

const prisma = require("../../../lib/prisma");
const { getUserFromRequest } = require("../../../lib/auth");
const { eventBus } = require("../../../lib/eventBus");

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // SSE response headers — must be set before flushHeaders()
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx/Vercel proxy buffering

  res.flushHeaders(); // send headers immediately so client knows connection is open
  if (res.socket) res.socket.setNoDelay(true);

  // Send initial connected event with current unread count
  let unreadCount = 0;
  try {
    unreadCount = await prisma.notification.count({
      where: { recipientWallet: user.wallet, read: false },
    });
  } catch {}

  res.write(`data: ${JSON.stringify({ type: "connected", unreadCount })}\n\n`);

  // Subscribe to notifications for this wallet
  const channel = `notification:${user.wallet}`;

  function onNotification(notification) {
    try {
      res.write(`data: ${JSON.stringify(notification)}\n\n`);
    } catch {}
  }

  eventBus.on(channel, onNotification);

  // Keep the connection alive — SSE spec says clients reconnect automatically,
  // but proxies and load balancers close idle connections after ~60s.
  const keepalive = setInterval(() => {
    try {
      res.write(": keepalive\n\n");
    } catch {
      clearInterval(keepalive);
    }
  }, 25000);

  // Cleanup when client disconnects or navigates away
  req.on("close", () => {
    eventBus.removeListener(channel, onNotification);
    clearInterval(keepalive);
  });
}
