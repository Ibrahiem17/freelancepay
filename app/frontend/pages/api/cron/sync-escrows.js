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
    // Sync both networks on every cron run. Mainnet sync failure is non-fatal.
    const devnetResult = await syncEscrows("devnet");

    let mainnetResult = null;
    if (process.env.MAINNET_PROGRAM_ID) {
      try {
        mainnetResult = await syncEscrows("mainnet");
      } catch (mainnetErr) {
        console.error("Mainnet indexer error (non-fatal):", mainnetErr.message);
        mainnetResult = { network: "mainnet", error: mainnetErr.message };
      }
    }

    return res.status(200).json({ success: true, devnet: devnetResult, mainnet: mainnetResult });
  } catch (err) {
    console.error("Devnet indexer error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
