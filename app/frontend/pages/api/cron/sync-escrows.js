const { syncEscrows } = require("../../../lib/indexer");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await syncEscrows();
    return res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("Indexer error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
