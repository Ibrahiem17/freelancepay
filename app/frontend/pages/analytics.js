import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Download, TrendingUp, Briefcase, Clock, Star } from "lucide-react";
import Layout from "@/components/Layout";
import StarRating from "@/components/StarRating";
import { useAuthContext } from "@/pages/_app";

// Recharts uses window — must be dynamically imported with ssr:false
const BarChart       = dynamic(() => import("recharts").then((m) => m.BarChart),       { ssr: false });
const Bar            = dynamic(() => import("recharts").then((m) => m.Bar),            { ssr: false });
const XAxis          = dynamic(() => import("recharts").then((m) => m.XAxis),          { ssr: false });
const YAxis          = dynamic(() => import("recharts").then((m) => m.YAxis),          { ssr: false });
const CartesianGrid  = dynamic(() => import("recharts").then((m) => m.CartesianGrid),  { ssr: false });
const Tooltip        = dynamic(() => import("recharts").then((m) => m.Tooltip),        { ssr: false });
const Legend         = dynamic(() => import("recharts").then((m) => m.Legend),         { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

// Hex values — CSS variables don't work in SVG fills
const COLOR_EARNED = "#c2d8b6"; // var(--sage)
const COLOR_SPENT  = "#d6c8ec"; // var(--lav)

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(yyyyMM) {
  const [, m] = yyyyMM.split("-");
  return MONTH_NAMES[parseInt(m, 10) - 1] || yyyyMM;
}

function truncWallet(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function AvatarSmall({ name, avatarUrl, size = 36 }) {
  const letter = (name || "?")[0].toUpperCase();
  const hue    = ((name || "A").charCodeAt(0) * 37) % 360;
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || "Avatar"}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--line)", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: `hsl(${hue},55%,78%)`,
        border: "2px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 800, color: "var(--ink)",
        fontFamily: "var(--font-display)", flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: "var(--paper)",
      border: "2.5px solid var(--line)",
      borderRadius: "var(--r-sm)",
      padding: "0.6rem 0.85rem",
      fontFamily: "var(--font-body)",
      fontWeight: 700,
      fontSize: "0.85rem",
      boxShadow: "var(--sh-md)",
    }}>
      <div style={{ color: "var(--ink-soft)", marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: "var(--ink)", display: "flex", justifyContent: "space-between", gap: "1rem" }}>
          <span>{p.name}</span>
          <span>{parseFloat(p.value).toFixed(4)} SOL</span>
        </div>
      ))}
    </div>
  );
}

const STATUS_BADGE = {
  COMPLETED: "badge-completed",
  CANCELLED: "badge-cancelled",
  ACTIVE:    "badge-active",
  SUBMITTED: "badge-submitted",
  REVISION_REQUESTED: "badge-revisionRequested",
};

export default function AnalyticsPage() {
  const router = useRouter();
  const auth   = useAuthContext();
  const user   = auth?.user ?? null;

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // Redirect unauthenticated users
  useEffect(() => {
    if (!auth?.loading && !user) {
      router.replace("/");
    }
  }, [auth?.loading, user, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analytics/me");
      if (res.status === 401) { router.replace("/"); return; }
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Failed to load analytics"); return; }
      setData(json);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (auth?.loading || (!user && !auth?.loading)) {
    return (
      <Layout title="Analytics">
        <div className="page" style={{ textAlign: "center", paddingTop: "4rem" }}>
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  const summary = data?.summary;
  const monthly = data?.monthlyData || [];
  const chartData = monthly.map((m) => ({
    month:  monthLabel(m.month),
    Earned: parseFloat(m.earned),
    Spent:  parseFloat(m.spent),
  }));

  return (
    <Layout title="Analytics">
      <div className="page">

        {/* ── Page header ── */}
        <div style={{ marginBottom: "1.75rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="eyebrow">Your Activity</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h2)", fontWeight: 700 }}>
              Analytics
            </h1>
            <p style={{ color: "var(--ink-soft)", fontWeight: 600, marginTop: "0.4rem", fontSize: "0.9rem" }}>
              Financial overview and contract history for your wallet.
            </p>
          </div>
          <a
            href="/api/analytics/export"
            download
            className="btn btn-outline"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Download size={15} strokeWidth={2.2} />
            Export CSV
          </a>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>{error}</div>
        )}

        {loading && !data ? (
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <div className="spinner" />
            <p style={{ marginTop: "1rem", color: "var(--ink-soft)", fontWeight: 600 }}>Loading your analytics…</p>
          </div>
        ) : data && (
          <>
            {/* ── Section A: Stats strip ── */}
            <div className="an-stats-strip">

              <div className="card an-stat-card">
                <div className="an-stat-icon" style={{ background: "var(--sage-lo)", color: "var(--leaf)" }}>
                  <TrendingUp size={18} strokeWidth={2} />
                </div>
                <div className="an-stat-value">{summary.totalEarnedSOL} SOL</div>
                <div className="an-stat-label">Total Earned</div>
              </div>

              <div className="card an-stat-card">
                <div className="an-stat-icon" style={{ background: "var(--lav-lo)", color: "var(--purple)" }}>
                  <Briefcase size={18} strokeWidth={2} />
                </div>
                <div className="an-stat-value">{summary.totalSpentSOL} SOL</div>
                <div className="an-stat-label">Total Spent</div>
              </div>

              <div
                className="card an-stat-card"
                style={parseFloat(summary.pendingEarningsSOL) > 0 ? { background: "var(--butter-lo, #fffbeb)", border: "2.5px solid var(--amber)" } : {}}
              >
                <div className="an-stat-icon" style={{ background: "var(--peach-lo)", color: "var(--orange)" }}>
                  <Clock size={18} strokeWidth={2} />
                </div>
                <div className="an-stat-value">{summary.pendingEarningsSOL} SOL</div>
                <div className="an-stat-label">Pending Earnings</div>
              </div>

              <div className="card an-stat-card">
                <div className="an-stat-icon" style={{ background: "var(--sage-lo)", color: "var(--leaf)" }}>
                  <Star size={18} strokeWidth={2} />
                </div>
                <div className="an-stat-value">{summary.completedEscrowsCount}</div>
                <div className="an-stat-label">Jobs Completed</div>
                {summary.averageRating != null && (
                  <div style={{ marginTop: 6 }}>
                    <StarRating value={summary.averageRating} size="sm" />
                  </div>
                )}
              </div>
            </div>

            {/* ── Section B: Monthly chart ── */}
            <div className="card" style={{ marginBottom: "1.5rem", padding: "1.5rem" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 700, marginBottom: "1.25rem" }}>
                Activity Over Time <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>(last 12 months)</span>
              </h2>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d4" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fontFamily: "var(--font-body)", fontWeight: 600, fill: "#9a8c7e" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 600, fill: "#9a8c7e" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v} SOL`}
                      width={70}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                    <Legend
                      wrapperStyle={{ fontSize: "0.82rem", fontFamily: "var(--font-body)", fontWeight: 700, paddingTop: 8 }}
                    />
                    <Bar dataKey="Earned" fill={COLOR_EARNED} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Spent"  fill={COLOR_SPENT}  radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Section C + D side-by-side on wide screens ── */}
            <div className="an-bottom-grid">

              {/* Section C: Top counterparties */}
              <div className="card an-section-card">
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 700, marginBottom: "1rem" }}>
                  Top Counterparties
                </h2>
                {data.topCounterparties.length === 0 ? (
                  <p style={{ color: "var(--ink-soft)", fontSize: "0.88rem", fontWeight: 600 }}>
                    Complete some contracts to see your top counterparties.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    {data.topCounterparties.map((cp, i) => (
                      <div key={cp.walletAddress} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ fontWeight: 800, color: "var(--ink-soft)", fontSize: "0.85rem", width: 16, flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <AvatarSmall name={cp.displayName || cp.walletAddress} avatarUrl={cp.avatarUrl} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Link
                            href={`/profile/${cp.walletAddress}`}
                            style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--ink)", textDecoration: "none" }}
                          >
                            {cp.displayName || truncWallet(cp.walletAddress)}
                          </Link>
                          <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)", fontWeight: 600, textTransform: "capitalize" }}>
                            {cp.role}
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--ink)", flexShrink: 0 }}>
                          {cp.totalSOL} SOL
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section D: Recent activity table */}
              <div className="card an-section-card">
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 700, marginBottom: "1rem" }}>
                  Recent Activity
                </h2>
                {data.recentActivity.length === 0 ? (
                  <p style={{ color: "var(--ink-soft)", fontSize: "0.88rem", fontWeight: 600 }}>
                    No completed or cancelled contracts yet.
                  </p>
                ) : (
                  <div className="an-activity-table">
                    <div className="an-activity-header">
                      <span>Date</span>
                      <span>Contract</span>
                      <span>Role</span>
                      <span>Status</span>
                      <span style={{ textAlign: "right" }}>Amount</span>
                    </div>
                    {data.recentActivity.map((r) => (
                      <div key={r.escrowPda} className="an-activity-row">
                        <span style={{ color: "var(--ink-soft)", fontSize: "0.78rem" }}>
                          {new Date(r.date).toLocaleDateString()}
                        </span>
                        <Link
                          href={`/escrow/${r.escrowPda}`}
                          style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--ink)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {r.title}
                        </Link>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--ink-soft)", textTransform: "capitalize" }}>
                          {r.role}
                        </span>
                        <span>
                          <span className={`badge ${STATUS_BADGE[r.status] || ""}`} style={{ fontSize: "0.72rem" }}>
                            {r.status.charAt(0) + r.status.slice(1).toLowerCase().replace("_", " ")}
                          </span>
                        </span>
                        <span style={{ textAlign: "right", fontWeight: 800, fontSize: "0.85rem", color: "var(--ink)" }}>
                          {r.amountSOL} SOL
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
