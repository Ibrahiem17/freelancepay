import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { Lock, Check, X, RotateCcw, RefreshCw, Download, Wallet } from "lucide-react";
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);
import Link from "next/link";
import Layout from "@/components/Layout";
import Toast from "@/components/Toast";
import { useEscrow } from "@/src/hooks/useEscrow";
import { parseSubmission } from "@/utils/ipfs";

const LAMPORTS = 1_000_000_000;

const STATUS_LABELS = {
  active:            "Active",
  submitted:         "Submitted",
  completed:         "Completed",
  cancelled:         "Cancelled",
  revisionRequested: "Revision Requested",
};

function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function EscrowCard({ escrow, onApprove, onCancel, onRequestRevision, busy }) {
  const [showRevision, setShowRevision] = useState(false);
  const [revMsg, setRevMsg]             = useState("");
  const sol        = (escrow.amount / LAMPORTS).toFixed(4);
  const isActive    = escrow.status === "active";
  const isSubmitted = escrow.status === "submitted";
  const parsed      = parseSubmission(escrow.workSubmission);

  async function handleRevision(e) {
    e.preventDefault();
    if (!revMsg.trim()) return;
    await onRequestRevision(escrow, revMsg.trim());
    setRevMsg("");
    setShowRevision(false);
  }

  return (
    <div className="card" data-reveal="rise" style={{ marginBottom: "1rem" }}>
      <div className="card-header">
        <div>
          <div className="card-title">{escrow.title}</div>
          <div style={{ marginTop: 6 }}><StatusBadge status={escrow.status} /></div>
        </div>
        <div className="card-amount">{sol} SOL</div>
      </div>

      {escrow.description && (
        <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)", marginTop: "0.5rem", lineHeight: 1.55, fontWeight: 600 }}>
          {escrow.description}
        </p>
      )}

      <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>
        Freelancer &nbsp;
        <span className="mono" style={{ color: "var(--ink-soft)" }}>{escrow.freelancer.slice(0, 16)}…{escrow.freelancer.slice(-8)}</span>
      </div>

      {escrow.workSubmission && (
        <div className="work-box">
          <strong>Work submitted</strong>
          <p style={{ marginTop: 4, margin: "4px 0 0" }}>{parsed.note}</p>
          {parsed.file && (
            <a
              className="btn-download"
              href={parsed.file}
              download={parsed.name}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginTop: "0.6rem" }}
            >
              <Download size={13} strokeWidth={2.2} className="icon" aria-hidden />
              {parsed.name || "Download Deliverable"}
            </a>
          )}
        </div>
      )}

      {escrow.status === "revisionRequested" && escrow.revisionNote && (
        <div className="revision-box">
          <strong>Revision requested</strong>
          <p style={{ marginTop: 4, margin: "4px 0 0" }}>{escrow.revisionNote}</p>
        </div>
      )}

      <div className="btn-row">
        <Link href={`/escrow/${escrow.pda}`} className="btn btn-outline btn-sm">View Details</Link>

        {isSubmitted && (
          <button className="btn btn-success btn-sm" onClick={() => onApprove(escrow)} disabled={busy}>
            {busy
              ? <><span className="spinner" /> Processing…</>
              : <><Check size={14} strokeWidth={2.2} className="icon" aria-hidden /> Approve &amp; Pay</>}
          </button>
        )}

        {isSubmitted && (
          <button
            className="btn btn-sm"
            style={{ background: "var(--peach-lo)", color: "var(--orange)", border: "2.5px solid var(--orange)" }}
            onClick={() => setShowRevision((s) => !s)}
            disabled={busy}
          >
            {showRevision
              ? <><X size={14} strokeWidth={2.2} className="icon" aria-hidden /> Cancel</>
              : <><RotateCcw size={14} strokeWidth={2.2} className="icon" aria-hidden /> Request Revision</>}
          </button>
        )}

        {isActive && (
          <button className="btn btn-danger btn-sm" onClick={() => onCancel(escrow)} disabled={busy}>
            {busy
              ? <><span className="spinner" /> Processing…</>
              : <><X size={14} strokeWidth={2.2} className="icon" aria-hidden /> Cancel</>}
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

      {isSubmitted && showRevision && (
        <form onSubmit={handleRevision} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "2.5px dashed var(--line)" }}>
          <label className="form-label">Describe the changes needed</label>
          <textarea
            className="form-textarea"
            value={revMsg}
            onChange={(e) => setRevMsg(e.target.value)}
            placeholder="e.g. Make the logo background transparent, adjust font to Inter…"
            required
          />
          <button
            type="submit"
            className="btn btn-sm"
            style={{ marginTop: "0.6rem", background: "var(--peach-lo)", color: "var(--orange)", border: "2.5px solid var(--orange)" }}
            disabled={busy || !revMsg.trim()}
          >
            {busy
              ? <><span className="spinner" /> Sending…</>
              : "Send Revision Request"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ClientPage() {
  const { publicKey } = useWallet();
  const { createEscrow, approveWork, cancelEscrow, requestRevision, fetchMyEscrowsAsClient } = useEscrow();

  const [form, setForm]       = useState({ title: "", description: "", freelancer: "", amount: "" });
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [toast, setToast]     = useState(null);

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

  async function handleRequestRevision(escrow, message) {
    setLoading(true);
    const r = await requestRevision(escrow.pda, message);
    if (r.success) {
      setToast({ type: "success", text: "Revision requested.", signature: r.signature });
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
          <h1 data-enter style={{ fontSize: "var(--fs-h2)", fontWeight: 700, fontFamily: "var(--font-display)" }}>
            Client Dashboard
          </h1>
          <p style={{ marginTop: 4, fontSize: "0.9rem", color: "var(--ink-soft)", fontWeight: 600 }}>
            Create escrows and manage your freelance contracts.
          </p>
        </div>

        {!publicKey ? (
          <div className="empty-state">
            <div className="icon-badge icon-badge--lav" style={{ margin: "0 auto 0.75rem" }}>
              <Wallet size={22} strokeWidth={2} aria-hidden />
            </div>
            <p style={{ marginBottom: "1rem" }}>Connect your wallet to create and manage escrows.</p>
            <WalletMultiButton />
          </div>
        ) : (
          <>
            {/* ── Create form ── */}
            <div className="card" style={{ marginBottom: "2rem" }}>
              <h2 data-enter style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem", fontFamily: "var(--font-display)" }}>
                Create New Escrow
              </h2>
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
                  {loading
                    ? <><span className="spinner" /> Creating escrow…</>
                    : <><Lock size={15} strokeWidth={2.2} className="icon" aria-hidden /> Create &amp; Lock SOL</>}
                </button>
              </form>
            </div>

            {/* ── Escrow list ── */}
            <div className="section-header">
              <h2 className="section-title">My Escrows</h2>
              <button className="btn btn-outline btn-sm" onClick={loadEscrows} disabled={fetching} aria-label="Refresh">
                {fetching
                  ? <span className="spinner" />
                  : <><RefreshCw size={13} strokeWidth={2.2} className="icon" aria-hidden /> Refresh</>}
              </button>
            </div>

            {escrows.length === 0 ? (
              <div className="empty-state">
                {fetching ? "Loading your escrows…" : "No escrows yet. Create your first one above."}
              </div>
            ) : (
              escrows.map((e) => (
                <EscrowCard
                  key={e.pda}
                  escrow={e}
                  onApprove={handleApprove}
                  onCancel={handleCancel}
                  onRequestRevision={handleRequestRevision}
                  busy={loading}
                />
              ))
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
