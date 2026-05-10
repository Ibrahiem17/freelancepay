import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import Layout from "@/components/Layout";
import Toast from "@/components/Toast";
import { useEscrow } from "@/src/hooks/useEscrow";

const LAMPORTS = 1_000_000_000;

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function EscrowCard({ escrow, onSubmitWork, busy }) {
  const [showForm, setShowForm] = useState(false);
  const [note, setNote]         = useState("");
  const sol = (escrow.amount / LAMPORTS).toFixed(4);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!note.trim()) return;
    await onSubmitWork(escrow.pda, note);
    setNote("");
    setShowForm(false);
  }

  return (
    <div className="card" style={{ marginBottom: "1rem" }}>
      <div className="card-header">
        <div>
          <div className="card-title">{escrow.title}</div>
          <div style={{ marginTop: 6 }}><StatusBadge status={escrow.status} /></div>
        </div>
        <div className="card-amount">{sol} SOL</div>
      </div>

      {escrow.description && (
        <p style={{ fontSize: "0.88rem", color: "#94a3b8", marginTop: "0.5rem", lineHeight: 1.5 }}>{escrow.description}</p>
      )}

      <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#64748b" }}>
        Client &nbsp;
        <span className="mono" style={{ color: "#94a3b8" }}>{escrow.client.slice(0, 16)}…{escrow.client.slice(-8)}</span>
      </div>

      {escrow.workSubmission && (
        <div className="work-box">
          <strong>Your submission</strong>
          <p style={{ marginTop: 4 }}>{escrow.workSubmission}</p>
        </div>
      )}

      {escrow.status === "completed" && (
        <div style={{ marginTop: "0.75rem", color: "#14F195", fontSize: "0.9rem", fontWeight: 600 }}>
          ⚡ Payment released to your wallet
        </div>
      )}

      <div className="btn-row">
        <Link href={`/escrow/${escrow.pda}`} className="btn btn-outline btn-sm">View Details</Link>

        {escrow.status === "active" && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowForm((s) => !s)}
          >
            {showForm ? "Cancel" : "✍ Submit Work"}
          </button>
        )}

        <a
          className="explorer-link"
          style={{ marginLeft: "auto", alignSelf: "center" }}
          href={`https://explorer.solana.com/address/${escrow.pda}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
        >
          Explorer ↗
        </a>
      </div>

      {escrow.status === "active" && showForm && (
        <form onSubmit={handleSubmit} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
          <label className="form-label">Work description / delivery link</label>
          <textarea
            className="form-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe what you delivered, include links to GitHub, Figma, hosted URLs…"
            required
          />
          <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: "0.6rem" }} disabled={busy || !note.trim()}>
            {busy ? <><span className="spinner" /> Submitting…</> : "Submit Work On-Chain"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function FreelancerPage() {
  const { publicKey } = useWallet();
  const { submitWork, fetchMyEscrowsAsFreelancer } = useEscrow();

  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [toast, setToast]     = useState(null);
  const clearToast = useCallback(() => setToast(null), []);

  const loadEscrows = useCallback(async () => {
    if (!publicKey) return;
    setFetching(true);
    const data = await fetchMyEscrowsAsFreelancer();
    setEscrows(data.sort((a, b) => b.createdAt - a.createdAt));
    setFetching(false);
  }, [publicKey, fetchMyEscrowsAsFreelancer]);

  useEffect(() => { loadEscrows(); }, [loadEscrows]);

  async function handleSubmitWork(pda, description) {
    setLoading(true);
    const r = await submitWork(pda, description);
    if (r.success) {
      setToast({ type: "success", text: "Work submitted on-chain! Waiting for client approval.", signature: r.signature });
      await loadEscrows();
    } else {
      setToast({ type: "error", text: r.error });
    }
    setLoading(false);
  }

  const activeCount    = escrows.filter((e) => e.status === "active").length;
  const submittedCount = escrows.filter((e) => e.status === "submitted").length;
  const completedCount = escrows.filter((e) => e.status === "completed").length;

  return (
    <Layout title="Freelancer Dashboard">
      <Toast msg={toast} onClose={clearToast} />
      <div className="page">
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Freelancer Dashboard</h1>
          <p className="muted" style={{ marginTop: 4, fontSize: "0.9rem" }}>View contracts assigned to your wallet and submit work.</p>
        </div>

        {!publicKey ? (
          <div className="empty-state">
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>👛</div>
            <p style={{ marginBottom: "1rem" }}>Connect your wallet to view your contracts.</p>
            <WalletMultiButton />
          </div>
        ) : (
          <>
            {/* ── Stats strip ── */}
            {escrows.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "var(--border)", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", marginBottom: "1.5rem" }}>
                {[
                  { label: "Active", count: activeCount, color: "#3b82f6" },
                  { label: "Pending approval", count: submittedCount, color: "#f59e0b" },
                  { label: "Completed", count: completedCount, color: "#14F195" },
                ].map(({ label, count, color }) => (
                  <div key={label} style={{ background: "var(--bg-card)", padding: "1rem", textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color, fontFamily: "'Courier New', monospace" }}>{count}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="section-header">
              <h2 className="section-title">My Contracts</h2>
              <button className="btn btn-outline btn-sm" onClick={loadEscrows} disabled={fetching}>
                {fetching ? <><span className="spinner" /></> : "↻ Refresh"}
              </button>
            </div>

            {escrows.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📋</div>
                {fetching ? "Loading contracts…" : "No contracts assigned to your wallet yet. Share your wallet address with a client to get started."}
              </div>
            ) : (
              escrows.map((e) => (
                <EscrowCard key={e.pda} escrow={e} onSubmitWork={handleSubmitWork} busy={loading} />
              ))
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
