import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { Lock, Check, X, RotateCcw, RefreshCw, Download, Wallet, Briefcase, ChevronDown, ChevronUp, UserCheck } from "lucide-react";
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);
import Link from "next/link";
import Layout from "@/components/Layout";
import Toast from "@/components/Toast";
import SkeletonCard from "@/components/SkeletonCard";
import { useEscrow } from "@/src/hooks/useEscrow";
import { parseSubmission } from "@/utils/ipfs";
import useSolPrice from "@/hooks/useSolPrice";

const STATUS_DOWN = {
  ACTIVE: "active", SUBMITTED: "submitted", COMPLETED: "completed",
  CANCELLED: "cancelled", REVISION_REQUESTED: "revisionRequested",
};

function normEscrow(e) {
  return {
    ...e,
    client:    e.clientWallet,
    freelancer: e.freelancerWallet,
    amount:    Number(e.amountLamports),
    status:    STATUS_DOWN[e.status] || e.status.toLowerCase(),
    createdAt: Math.floor(new Date(e.onChainCreatedAt).getTime() / 1000),
  };
}

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

function EscrowCard({ escrow, onApprove, onCancel, onRequestRevision, busy, solPrice }) {
  const [showRevision, setShowRevision] = useState(false);
  const [revMsg, setRevMsg]             = useState("");
  const sol        = (escrow.amount / LAMPORTS).toFixed(4);
  const isActive    = escrow.status === "active";
  const isSubmitted = escrow.status === "submitted";
  const parsed      = parseSubmission(escrow.workSubmission);
  const usd         = solPrice ? `≈ $${(parseFloat(sol) * solPrice).toFixed(2)}` : null;

  async function handleRevision(e) {
    e.preventDefault();
    if (!revMsg.trim()) return;
    await onRequestRevision(escrow, revMsg.trim());
    setRevMsg("");
    setShowRevision(false);
  }

  return (
    <div className="card" data-reveal="rise" data-testid="escrow-card" style={{ marginBottom: "1rem" }}>
      <div className="card-header">
        <div>
          <div className="card-title">{escrow.title}</div>
          <div style={{ marginTop: 6 }}><StatusBadge status={escrow.status} /></div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="card-amount">{sol} SOL</div>
          {usd && <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", fontWeight: 600, marginTop: 2 }}>{usd}</div>}
        </div>
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

function truncWallet(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

function MyPostedJobs({ onHireFreelancer }) {
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState({});
  const [actingOn, setActingOn] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/jobs/mine");
      const data = await res.json();
      if (res.ok) setJobs(data.jobs || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAction(jobId, appId, action) {
    setActingOn(appId);
    try {
      await fetch(`/api/jobs/${jobId}/applications`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ appId, action }),
      });
      await load();
    } finally {
      setActingOn(null);
    }
  }

  if (loading) return <div style={{ padding: "1rem 0", color: "var(--ink-soft)", fontWeight: 600 }}>Loading your jobs…</div>;
  if (jobs.length === 0) return (
    <div className="empty-state" style={{ marginBottom: "2rem" }}>
      No jobs posted yet. <Link href="/post-job" className="btn btn-sm btn-primary" style={{ marginLeft: 8 }}>Post a Job</Link>
    </div>
  );

  return (
    <div style={{ marginBottom: "2rem" }}>
      {jobs.map((job) => {
        const isOpen   = open[job.id];
        const pending  = job.applications || [];
        const isFilled = job.status === "FILLED";

        return (
          <div key={job.id} className="card" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "1rem" }}>{job.title}</span>
                  <span className={`badge ${isFilled ? "badge-completed" : "badge-active"}`} style={{ fontSize: "0.7rem" }}>
                    {isFilled ? "Filled" : "Open"}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600, marginTop: 2 }}>
                  Budget: {job.budgetSOL} SOL · {job.totalApplications} application{job.totalApplications !== 1 ? "s" : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                <Link href={`/post-job?edit=${job.id}`} className="btn btn-sm btn-outline" style={{ fontSize: "0.75rem" }}>Edit</Link>
                {pending.length > 0 && (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setOpen((s) => ({ ...s, [job.id]: !s[job.id] }))}
                    style={{ fontSize: "0.75rem" }}
                  >
                    {isOpen ? <><ChevronUp size={12} /> Hide</> : <><ChevronDown size={12} /> {pending.length} Proposal{pending.length !== 1 ? "s" : ""}</>}
                  </button>
                )}
              </div>
            </div>

            {isOpen && pending.length > 0 && (
              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "2px solid var(--line)", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {pending.map((app) => {
                  const fl       = app.freelancer;
                  const flName   = fl.displayName || truncWallet(fl.walletAddress);
                  const isBusy   = actingOn === app.id;
                  return (
                    <div key={app.id} style={{ padding: "0.85rem", background: "var(--lav-lo)", borderRadius: "var(--r-md)", border: "1.5px solid var(--lav)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{flName}</div>
                          <div className="mono" style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>{truncWallet(fl.walletAddress)}</div>
                          {fl.averageRating && (
                            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--amber)", marginTop: 2 }}>★ {fl.averageRating.toFixed(1)}</div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            className="btn btn-sm btn-success"
                            disabled={isBusy}
                            onClick={() => {
                              handleAction(job.id, app.id, "accept");
                              onHireFreelancer({
                                freelancerWallet: fl.walletAddress,
                                title:            job.title,
                                description:      job.description,
                                amount:           String(job.budgetSOL),
                              });
                            }}
                          >
                            {isBusy ? <span className="spinner" /> : <><UserCheck size={13} strokeWidth={2.2} /> Accept & Hire</>}
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            disabled={isBusy}
                            onClick={() => handleAction(job.id, app.id, "reject")}
                          >
                            {isBusy ? <span className="spinner" /> : <><X size={13} strokeWidth={2.2} /> Reject</>}
                          </button>
                        </div>
                      </div>
                      <p style={{ marginTop: "0.6rem", fontSize: "0.85rem", color: "var(--ink)", fontWeight: 600, lineHeight: 1.5 }}>
                        {app.proposal}
                      </p>
                      <Link href={`/profile/${fl.walletAddress}`} style={{ fontSize: "0.75rem", color: "var(--purple)", fontWeight: 700 }}>
                        View profile →
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const SYNC_DELAY = 2500;

export default function ClientPage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const { createEscrow, approveWork, cancelEscrow, requestRevision } = useEscrow();
  const solPrice   = useSolPrice();
  const escrowRef  = useRef(null);

  const [form, setForm]       = useState({ title: "", description: "", freelancer: "", amount: "" });

  // Pre-fill from ?hire= query param OR from "Accept & Hire" in MyPostedJobs
  useEffect(() => {
    if (router.query.hire) {
      setForm((f) => ({ ...f, freelancer: router.query.hire }));
    }
  }, [router.query.hire]);

  function handleHireFreelancer({ freelancerWallet, title, description, amount }) {
    setForm({ title, description, freelancer: freelancerWallet, amount });
    setTimeout(() => escrowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  const [escrows,  setEscrows]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(false);
  const [syncing,  setSyncing]  = useState(false);
  const [toast,    setToast]    = useState(null);

  const clearToast = useCallback(() => setToast(null), []);

  const loadEscrows = useCallback(async () => {
    if (!publicKey) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/escrows?role=client&wallet=${publicKey.toBase58()}`);
      if (!res.ok) return;
      const data = await res.json();
      setEscrows((data.escrows || []).map(normEscrow).sort((a, b) => b.createdAt - a.createdAt));
    } finally {
      setFetching(false);
    }
  }, [publicKey]);

  useEffect(() => { loadEscrows(); }, [loadEscrows]);

  const field = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function syncAfter(msg, signature) {
    setToast({ type: "success", text: msg, signature });
    setSyncing(true);
    await new Promise((r) => setTimeout(r, SYNC_DELAY));
    await loadEscrows();
    setSyncing(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title || !form.freelancer || !form.amount) return;
    setLoading(true);
    const r = await createEscrow(form.title, form.description, form.freelancer, parseFloat(form.amount));
    if (r.success) {
      setForm({ title: "", description: "", freelancer: "", amount: "" });
      await syncAfter(`Escrow created! ${parseFloat(form.amount)} SOL locked.`, r.signature);
    } else {
      setToast({ type: "error", text: r.error });
    }
    setLoading(false);
  }

  async function handleApprove(escrow) {
    setLoading(true);
    const r = await approveWork(escrow.pda, escrow.freelancer);
    if (r.success) {
      await syncAfter("Work approved! SOL sent to freelancer.", r.signature);
    } else {
      setToast({ type: "error", text: r.error });
    }
    setLoading(false);
  }

  async function handleCancel(escrow) {
    setLoading(true);
    const r = await cancelEscrow(escrow.pda);
    if (r.success) {
      await syncAfter("Escrow cancelled. SOL refunded to your wallet.", r.signature);
    } else {
      setToast({ type: "error", text: r.error });
    }
    setLoading(false);
  }

  async function handleRequestRevision(escrow, message) {
    setLoading(true);
    const r = await requestRevision(escrow.pda, message);
    if (r.success) {
      await syncAfter("Revision requested.", r.signature);
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
            {/* ── Sync indicator ── */}
            {syncing && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1rem", background: "var(--sage-lo)", border: "2.5px solid var(--line)", borderRadius: "var(--r-md)", marginBottom: "1rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--leaf)" }}>
                <span className="spinner" style={{ width: 14, height: 14 }} />
                Syncing with blockchain…
              </div>
            )}

            {/* ── My Posted Jobs ── */}
            <div style={{ marginBottom: "0.5rem" }}>
              <div className="section-header" style={{ marginBottom: "1rem" }}>
                <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Briefcase size={16} strokeWidth={2} /> My Posted Jobs
                </h2>
                <Link href="/post-job" className="btn btn-sm btn-primary">+ Post a Job</Link>
              </div>
              <MyPostedJobs onHireFreelancer={handleHireFreelancer} />
            </div>

            {/* ── Create form ── */}
            <div className="card" ref={escrowRef} style={{ marginBottom: "2rem" }}>
              <h2 data-enter style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem", fontFamily: "var(--font-display)" }}>
                Create Escrow
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600, marginBottom: "1.25rem" }}>
                Lock SOL for a freelancer you&apos;ve already agreed with, or use <strong>Accept &amp; Hire</strong> above to auto-fill from an application.
              </p>
              <form onSubmit={handleCreate} data-testid="create-escrow-form">
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
                  {solPrice && form.amount && !isNaN(parseFloat(form.amount)) && (
                    <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)", fontWeight: 600, marginTop: "0.35rem" }}>
                      ≈ ${(parseFloat(form.amount) * solPrice).toFixed(2)} USD &nbsp;·&nbsp; 1 SOL = ${solPrice.toLocaleString()} USD
                    </div>
                  )}
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

            {fetching && escrows.length === 0 ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : escrows.length === 0 ? (
              <div className="empty-state">No escrows yet. Create your first one above.</div>
            ) : (
              escrows.map((e) => (
                <EscrowCard
                  key={e.pda}
                  escrow={e}
                  onApprove={handleApprove}
                  onCancel={handleCancel}
                  onRequestRevision={handleRequestRevision}
                  busy={loading}
                  solPrice={solPrice}
                />
              ))
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
