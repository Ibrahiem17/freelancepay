// Manual indexer run — syncs all on-chain escrows to PostgreSQL.
// Usage: node scripts/run-indexer.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const { syncEscrows } = require("../lib/indexer");
const prisma = require("../lib/prisma");

async function main() {
  console.log("FreelancePay Indexer — manual run\n");
  const result = await syncEscrows();
  console.log("\nResult:", result);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
