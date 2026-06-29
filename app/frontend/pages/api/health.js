import { Connection } from "@solana/web3.js";

const prisma = require("../../lib/prisma");

const DEVNET_RPC = "https://api.devnet.solana.com";
const SOLANA_TIMEOUT_MS = 5000;

async function checkDatabase() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (e) {
    return { status: "error", latencyMs: Date.now() - start, error: e.message };
  }
}

async function checkSolana() {
  const start = Date.now();
  try {
    const connection = new Connection(DEVNET_RPC, "confirmed");
    const slot = await Promise.race([
      connection.getSlot(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Solana RPC timed out")), SOLANA_TIMEOUT_MS)
      ),
    ]);
    return { status: "ok", slot, latencyMs: Date.now() - start };
  } catch (e) {
    return { status: "error", latencyMs: Date.now() - start, error: e.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const [database, solana] = await Promise.all([checkDatabase(), checkSolana()]);

  const bothFailed = database.status === "error" && solana.status === "error";
  const oneFailed  = database.status === "error" || solana.status === "error";
  const status     = bothFailed ? "error" : oneFailed ? "degraded" : "ok";

  // Always 200 — monitoring tools read the status field, not the HTTP code
  return res.status(200).json({
    status,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    checks: { database, solana },
  });
}
