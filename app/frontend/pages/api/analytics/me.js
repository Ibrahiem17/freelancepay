const prisma = require("../../../lib/prisma");
const { ok, err, requireAuth } = require("../../../lib/api-helpers");

const LAMPORTS = 1_000_000_000n;

function lamToSOL(bigint) {
  return (Number(bigint) / Number(LAMPORTS)).toFixed(4);
}

// Build the last 12 calendar months in YYYY-MM order, newest last
function buildMonthSlots() {
  const slots = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    slots.push(key);
  }
  return slots;
}

function rowsToMonthMap(rows) {
  const map = {};
  for (const r of rows) {
    // r.month is a Date (Postgres date_trunc returns timestamp)
    const d = new Date(r.month);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    map[key] = BigInt(r.total);
  }
  return map;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return err(res, "Method not allowed", 405);

  const user = await requireAuth(req, res);
  if (!user) return;

  const wallet = user.wallet;

  try {
    // ── All escrows for this wallet ──────────────────────────────────────────
    const [asFreelancer, asClient] = await Promise.all([
      prisma.escrow.findMany({
        where: { freelancerWallet: wallet },
        select: { pda: true, title: true, status: true, amountLamports: true, onChainCreatedAt: true, clientWallet: true },
        orderBy: { onChainCreatedAt: "desc" },
      }),
      prisma.escrow.findMany({
        where: { clientWallet: wallet },
        select: { pda: true, title: true, status: true, amountLamports: true, onChainCreatedAt: true, freelancerWallet: true },
        orderBy: { onChainCreatedAt: "desc" },
      }),
    ]);

    // ── Summary calculations ─────────────────────────────────────────────────
    const completedFreelancer = asFreelancer.filter((e) => e.status === "COMPLETED");
    const completedClient     = asClient.filter((e) => e.status === "COMPLETED");
    const pendingFreelancer   = asFreelancer.filter((e) => e.status === "ACTIVE" || e.status === "SUBMITTED");

    const totalEarned  = completedFreelancer.reduce((s, e) => s + e.amountLamports, 0n);
    const totalSpent   = completedClient.reduce((s, e) => s + e.amountLamports, 0n);
    const pendingTotal = pendingFreelancer.reduce((s, e) => s + e.amountLamports, 0n);

    const allEscrows    = [...asFreelancer, ...asClient];
    const allPdas       = new Set();
    const dedupedAll    = allEscrows.filter((e) => { if (allPdas.has(e.pda)) return false; allPdas.add(e.pda); return true; });
    const activeCount   = dedupedAll.filter((e) => e.status === "ACTIVE" || e.status === "SUBMITTED" || e.status === "REVISION_REQUESTED").length;
    const completedCount = dedupedAll.filter((e) => e.status === "COMPLETED").length;
    const cancelledCount = dedupedAll.filter((e) => e.status === "CANCELLED").length;

    const dbUser = await prisma.user.findUnique({
      where:  { walletAddress: wallet },
      select: { averageRating: true },
    });

    // ── Monthly data (raw SQL) ───────────────────────────────────────────────
    const [earnedRows, spentRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT date_trunc('month', "onChainCreatedAt") AS month,
               SUM("amountLamports")::text             AS total
        FROM   "Escrow"
        WHERE  "freelancerWallet" = ${wallet}
          AND  status = 'COMPLETED'
        GROUP  BY month
        ORDER  BY month
      `,
      prisma.$queryRaw`
        SELECT date_trunc('month', "onChainCreatedAt") AS month,
               SUM("amountLamports")::text             AS total
        FROM   "Escrow"
        WHERE  "clientWallet" = ${wallet}
          AND  status = 'COMPLETED'
        GROUP  BY month
        ORDER  BY month
      `,
    ]);

    const earnedMap = rowsToMonthMap(earnedRows);
    const spentMap  = rowsToMonthMap(spentRows);
    const slots     = buildMonthSlots();

    const monthlyData = slots.map((month) => ({
      month,
      earned: lamToSOL(earnedMap[month] ?? 0n),
      spent:  lamToSOL(spentMap[month]  ?? 0n),
    }));

    // ── Top counterparties ───────────────────────────────────────────────────
    const counterpartyMap = {};

    for (const e of completedFreelancer) {
      if (!counterpartyMap[e.clientWallet]) {
        counterpartyMap[e.clientWallet] = { walletAddress: e.clientWallet, role: "client", total: 0n };
      }
      counterpartyMap[e.clientWallet].total += e.amountLamports;
    }
    for (const e of completedClient) {
      if (!counterpartyMap[e.freelancerWallet]) {
        counterpartyMap[e.freelancerWallet] = { walletAddress: e.freelancerWallet, role: "freelancer", total: 0n };
      }
      counterpartyMap[e.freelancerWallet].total += e.amountLamports;
    }

    const topWallets = Object.values(counterpartyMap)
      .sort((a, b) => (b.total > a.total ? 1 : b.total < a.total ? -1 : 0))
      .slice(0, 3);

    let counterpartyProfiles = [];
    if (topWallets.length > 0) {
      counterpartyProfiles = await prisma.user.findMany({
        where:  { walletAddress: { in: topWallets.map((w) => w.walletAddress) } },
        select: { walletAddress: true, displayName: true, avatarUrl: true },
      });
    }
    const profileMap = Object.fromEntries(counterpartyProfiles.map((u) => [u.walletAddress, u]));

    const topCounterparties = topWallets.map((w) => ({
      walletAddress: w.walletAddress,
      displayName:   profileMap[w.walletAddress]?.displayName || null,
      avatarUrl:     profileMap[w.walletAddress]?.avatarUrl    || null,
      role:          w.role,
      totalSOL:      lamToSOL(w.total),
    }));

    // ── Recent activity (last 10 completed or cancelled) ─────────────────────
    const recent = dedupedAll
      .filter((e) => e.status === "COMPLETED" || e.status === "CANCELLED")
      .slice(0, 10)
      .map((e) => ({
        escrowPda: e.pda,
        title:     e.title,
        status:    e.status,
        amountSOL: lamToSOL(e.amountLamports),
        role:      asFreelancer.some((f) => f.pda === e.pda) ? "freelancer" : "client",
        date:      e.onChainCreatedAt.toISOString(),
      }));

    return ok(res, {
      summary: {
        totalEarnedSOL:        lamToSOL(totalEarned),
        totalSpentSOL:         lamToSOL(totalSpent),
        pendingEarningsSOL:    lamToSOL(pendingTotal),
        activeEscrowsCount:    activeCount,
        completedEscrowsCount: completedCount,
        cancelledEscrowsCount: cancelledCount,
        averageRating:         dbUser?.averageRating ?? null,
      },
      monthlyData,
      topCounterparties,
      recentActivity: recent,
    });
  } catch (e) {
    console.error("GET /api/analytics/me error:", e.message);
    return err(res, "Internal server error", 500);
  }
}
