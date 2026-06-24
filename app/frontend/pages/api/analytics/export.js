const prisma = require("../../../lib/prisma");
const { err, requireAuth } = require("../../../lib/api-helpers");

function escapeCSV(value) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function lamToSOL(bigint) {
  return (Number(bigint) / 1_000_000_000).toFixed(4);
}

export default async function handler(req, res) {
  if (req.method !== "GET") return err(res, "Method not allowed", 405);

  const user = await requireAuth(req, res);
  if (!user) return;

  const wallet = user.wallet;

  try {
    const [asFreelancer, asClient] = await Promise.all([
      prisma.escrow.findMany({
        where:   { freelancerWallet: wallet },
        orderBy: { onChainCreatedAt: "desc" },
        select:  { pda: true, title: true, status: true, amountLamports: true, onChainCreatedAt: true, clientWallet: true },
      }),
      prisma.escrow.findMany({
        where:   { clientWallet: wallet },
        orderBy: { onChainCreatedAt: "desc" },
        select:  { pda: true, title: true, status: true, amountLamports: true, onChainCreatedAt: true, freelancerWallet: true },
      }),
    ]);

    // Merge, deduplicate by PDA, tag role
    const seen = new Set();
    const rows = [];

    for (const e of asFreelancer) {
      if (seen.has(e.pda)) continue;
      seen.add(e.pda);
      rows.push({ ...e, myRole: "freelancer", counterparty: e.clientWallet });
    }
    for (const e of asClient) {
      if (seen.has(e.pda)) continue;
      seen.add(e.pda);
      rows.push({ ...e, myRole: "client", counterparty: e.freelancerWallet });
    }

    // Sort newest first
    rows.sort((a, b) => new Date(b.onChainCreatedAt) - new Date(a.onChainCreatedAt));

    const headers = ["Date", "EscrowTitle", "EscrowPDA", "MyRole", "CounterpartyWallet", "Status", "AmountSOL"];
    const csvRows = rows.map((r) => [
      new Date(r.onChainCreatedAt).toISOString().slice(0, 10),
      r.title,
      r.pda,
      r.myRole,
      r.counterparty,
      r.status,
      lamToSOL(r.amountLamports),
    ].map(escapeCSV).join(","));

    const csv = [headers.join(","), ...csvRows].join("\n");

    const date     = new Date().toISOString().slice(0, 10);
    const filename = `freelancepay-${wallet.slice(0, 8)}-${date}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).end(csv);
  } catch (e) {
    console.error("GET /api/analytics/export error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
