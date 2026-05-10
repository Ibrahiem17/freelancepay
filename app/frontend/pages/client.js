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

function EscrowCard({ escrow, onApprove, onCancel, busy }) {
  const sol = (escrow.amount / LAMPORTS).toFixed(4);
  const isActive    = escrow.status === "active";
  const isSubmitted = escrow.status === "submitted";

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
        Freelancer &nbsp;
        <span className="mono" style={{ color: "#94a3b8" }}>{escrow.freelancer.slice(0, 16)}…{escrow.freelancer.slice(-8)}</span>
      </div>

      {escrow.workSubmission && (
        <div className="work-box">
          <strong>Work submitted</strong>
          <p style={{ marginTop: 4 }}>{escrow.workSubmission}</p>
        </div>
      )}

      <div className="btn-row">
        <Link href={`/escrow/${escrow.pda}`} className="btn btn-outline btn-sm">View Details</Link>

        {isSubmitted && (
          <button className="btn btn-success btn-sm" onClick={() => onApprove(escrow)} disabled={busy}>
            {busy ? <><span className="spinner" /> Processing…</> : "✓ Approve & Pay"}
          </button>
        )}

        {isActive && (
          <button className="btn btn-danger btn-sm" onClick={() => onCancel(escrow)} disabled={busy}>
            {busy ? <><span className="spinner" /> Processing…</> : "✕ Cancel"}
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
    </div>
  );
}

export default function ClientPage() {
  const { publicKey } = useWallet();
  const { createEscrow, approveWork, cancelEscrow, fetchMyEscrowsAsClient } = useEscrow();

  const [form, setForm]     = useState({ title: "", description: "", freelancer: "", amount: "" });
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [toast, setToast]   = useState(null);

  const clearToast = useCallback(() => setToast(null), []);

  const loadEscrows = useCallback(async () => {
    if (!publicKey) return;
    setFetching(true);
    const data = await fetchMyEscrowsAsClient();
    setEscrows(data.sort((a, b) => b.createdAt - a.createdAt));
    setFetching(false);
  }, [publicKey, fetchMyEscrowsAsClient]);

  useEffect(() => { loadEscrows(); }, [loadEscrows]);

  const field = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title || !form.freelancer || !form.amount) return;
    setLoading(true);
    const r = await createEscrow(form.title, form.description, form.freelancer, parseFloat(form.amount));
    if (r.success) {
      setToast({ type: "success", text: `Escrow created! ${parseFloat(form.amount)} SOL locked.`, signature: r.signature });
      setForm({ title: "", description: "", freelancer: "", amount: "" });
      await loadEscrows();
    } else {
      setToast({ type: "error", text: r.error });
    }
    setLoading(false);
  }

  async function handleApprove(escrow) {
    setLoading(true);
    const r = await approveWork(escrow.pda, escrow.freelancer);
    if (r.success) {
      setToast({ type: "success", text: "Work approved! SOL sent to freelancer.", signature: r.signature });
      await loadEscrows();
    } else {
      setToast({ type: "error", text: r.error });
    }
    setLoading(false);
  }

  async function handleCancel(escrow) {
    setLoading(true);
    const r = await cancelEscrow(escrow.pda);
    if (r.success) {
      setToast({ type: "success", text: "Escrow cancelled. SOL refunded to your wallet.", signature: r.signature });
      await loadEscrows();
    } else {
      setToast({ type: "error", text: r.error });
    }
    setLoading(false);
  }

  return (
    <Layout title="Client Dashboard">
      <Toast msg={toast} onClose={clearToast} />
      <div className="page">
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Client Dashboard</h1>
          <p className="muted" style={{ marginTop: 4, fontSize: "0.9rem" }}>Create escrows and manage your freelance contracts.</p>
        </div>

        {!publicKey ? (
          <div className="empty-state">
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>👛</div>
            <p style={{ marginBottom: "1rem" }}>Connect your wallet to create and manage escrows.</p>
            <WalletMultiButton />
          </div>
        ) : (
          <>
            {/* ── Create form ── */}
            <div className="card" style={{ marginBottom: "2rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}>Create New Escrow</h2>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label">Project title *</label>
                  <input className="form-input" value={form.title} onChange={field("title")} placeholder="e.g. Build my e-commerce website" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description} onChange={field("description")} placeholder="Describe the project scope and deliverables…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Freelancer wallet address *</label>
                  <input className="form-input mono" value={form.freelancer} onChange={field("freelancer")} placeholder="Solana public key (base58)" required />
                </div>
                <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                  <label className="form-label">Amount (SOL) *</label>
                  <input className="form-input" type="number" step="0.001" min="0.001" value={form.amount} onChange={field("amount")} placeholder="e.g. 0.5" required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
                  {loading ? <><span className="spinner" /> Creating escrow…</> : "🔒 Create & Lock SOL"}
                </button>
              </form>
            </div>

            {/* ── Escrow list ── */}
            <div className="section-header">
              <h2 className="section-title">My Escrows</h2>
              <button className="btn btn-outline btn-sm" onClick={loadEscrows} disabled={fetching}>
                {fetching ? <><span className="spinner" /></> : "↻ Refresh"}
              </button>
            </div>

            {escrows.length === 0 ? (
              <div className="empty-state">
                {fetching ? "Loading your escrows…" : "No escrows yet. Create your first one above."}
              </div>
            ) : (
              escrows.map((e) => (
                <EscrowCard key={e.pda} escrow={e} onApprove={handleApprove} onCancel={handleCancel} busy={loading} />
              ))
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
