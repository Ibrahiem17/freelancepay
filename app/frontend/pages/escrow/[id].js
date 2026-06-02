import { useRouter } from "next/router";
import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);
import Link from "next/link";
import Layout from "@/components/Layout";
import Toast from "@/components/Toast";
import { useEscrow } from "@/src/hooks/useEscrow";
import { uploadToIPFS, parseSubmission } from "@/utils/ipfs";

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

const TIMELINE = ["active", "submitted", "completed"];

export default function EscrowDetailPage() {
  const router = useRouter();
  const { id }   = router.query;
  const { publicKey } = useWallet();
  const { fetchEscrowByPDA, approveWork, cancelEscrow, submitWork, requestRevision } = useEscrow();

  const [escrow, setEscrow]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [toast, setToast]             = useState(null);
  // freelancer submit state
  const [submitNote, setSubmitNote]   = useState("");
  const [submitFile, setSubmitFile]   = useState(null);
  const [uploading, setUploading]     = useState(false);
  const submitFileRef                 = useRef(null);
  // client revision state
  const [showRevision, setShowRevision] = useState(false);
  const [revMsg, setRevMsg]             = useState("");
  const clearToast = useCallback(() => setToast(null), []);

  const reload = useCallback(async () => {
    if (!id || !publicKey) return;
    const data = await fetchEscrowByPDA(id);
    setEscrow(data);
  }, [id, publicKey, fetchEscrowByPDA]);

  useEffect(() => { reload(); }, [reload]);

  async function handleApprove() {
    setLoading(true);
    const r = await approveWork(escrow.pda, escrow.freelancer);
    if (r.success) {
      setToast({ type: "success", text: "Work approved! SOL sent to freelancer.", signature: r.signature });
      await reload();
    } else {
      setToast({ type: "error", text: r.error });
    }
    setLoading(false);
  }

  async function handleCancel() {
    setLoading(true);
    const r = await cancelEscrow(escrow.pda);
    if (r.success) {
      setToast({ type: "success", text: "Escrow cancelled. SOL refunded.", signature: r.signature });
      await reload();
    } else {
      setToast({ type: "error", text: r.error });
    }
    setLoading(false);
  }

  async function handleRequestRevision(e) {
    e.preventDefault();
    if (!revMsg.trim()) return;
    setLoading(true);
    const r = await requestRevision(escrow.pda, revMsg.trim());
    if (r.success) {
      setToast({ type: "success", text: "Revision requested. The freelancer will be notified.", signature: r.signature });
      setRevMsg("");
      setShowRevision(false);
      await reload();
    } else {
      setToast({ type: "error", text: r.error });
    }
    setLoading(false);
  }

  async function handleSubmitWork(e) {
    e.preventDefault();
    setLoading(true);

    let ipfsUrl = null, fileName = null;
    if (submitFile) {
      setUploading(true);
      const result = await uploadToIPFS(submitFile);
      setUploading(false);
      if (result.error) {
        setToast({ type: "error", text: result.error });
        setLoading(false);
        return;
      }
      ipfsUrl = result.url;
      fileName = result.name;
    }

    let trimmedNote = submitNote.trim();
    let encoded = JSON.stringify({ note: trimmedNote, file: ipfsUrl, name: fileName });
    while (encoded.length > 500 && trimmedNote.length > 0) {
      trimmedNote = trimmedNote.slice(0, -1);
      encoded = JSON.stringify({ note: trimmedNote, file: ipfsUrl, name: fileName });
    }

    const r = await submitWork(escrow.pda, encoded);
    if (r.success) {
      setToast({ type: "success", text: "Work submitted on-chain!", signature: r.signature });
      setSubmitNote("");
      setSubmitFile(null);
      if (submitFileRef.current) submitFileRef.current.value = "";
      await reload();
    } else {
      setToast({ type: "error", text: r.error });
    }
    setLoading(false);
  }

  const isClient     = escrow && publicKey && escrow.client === publicKey.toBase58();
  const isFreelancer = escrow && publicKey && escrow.freelancer === publicKey.toBase58();
  const isCancelled  = escrow?.status === "cancelled";
  const canFreelancerSubmit = escrow?.status === "active" || escrow?.status === "revisionRequested";

  const submission = escrow?.workSubmission ? parseSubmission(escrow.workSubmission) : null;

  return (
    <Layout title="Escrow Detail">
      <Toast msg={toast} onClose={clearToast} />
      <div className="page">
        <div style={{ marginBottom: "1.25rem" }}>
          <Link href="/" className="muted" style={{ fontSize: "0.85rem" }}>← Home</Link>
          {isClient && <Link href="/client" className="muted" style={{ fontSize: "0.85rem", marginLeft: "1rem" }}>← My Escrows</Link>}
          {isFreelancer && <Link href="/freelancer" className="muted" style={{ fontSize: "0.85rem", marginLeft: "1rem" }}>← My Contracts</Link>}
        </div>

        {!publicKey ? (
          <div className="empty-state">
            <p style={{ marginBottom: "1rem" }}>Connect your wallet to view this escrow.</p>
            <WalletMultiButton />
          </div>
        ) : !escrow ? (
          <div className="empty-state">Loading escrow data…</div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="card" style={{ marginBottom: "1rem" }}>
              <div className="card-header">
                <div>
                  <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>{escrow.title}</h1>
                  <div style={{ marginTop: 8 }}><StatusBadge status={escrow.status} /></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="card-amount">{(escrow.amount / LAMPORTS).toFixed(4)} SOL</div>
                  <div className="muted" style={{ fontSize: "0.75rem", marginTop: 4 }}>locked in escrow</div>
                </div>
              </div>

              {escrow.description && (
                <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#94a3b8", lineHeight: 1.6 }}>{escrow.description}</p>
              )}

              {!isCancelled && (
                <div style={{ display: "flex", gap: 0, marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)" }}>
                  {TIMELINE.map((step, i) => {
                    const done    = TIMELINE.indexOf(escrow.status) >= i;
                    const current = escrow.status === step;
                    return (
                      <div key={step} style={{ flex: 1, textAlign: "center", position: "relative" }}>
                        {i > 0 && (
                          <div style={{ position: "absolute", top: 11, right: "50%", left: "-50%", height: 2, background: done ? "var(--green)" : "var(--border)" }} />
                        )}
                        <div style={{ width: 22, height: 22, borderRadius: "50%", margin: "0 auto 6px", background: done ? "var(--green)" : "var(--border)", border: current ? "2px solid #14F195" : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: done ? "#0a0f1e" : "#64748b", position: "relative", zIndex: 1 }}>
                          {done ? "✓" : i + 1}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: done ? "#14F195" : "#64748b", textTransform: "capitalize" }}>{step}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Details ── */}
            <div className="card" style={{ marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Contract Details</h2>
              {[
                ["PDA Address", escrow.pda],
                ["Client",      escrow.client],
                ["Freelancer",  escrow.freelancer],
                ["Created",     new Date(escrow.createdAt * 1000).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", padding: "8px 0", borderBottom: "1px solid var(--border)", gap: "1rem" }}>
                  <div style={{ minWidth: 90, color: "#64748b", fontSize: "0.82rem" }}>{label}</div>
                  <div className="mono" style={{ fontSize: "0.8rem", color: "#94a3b8", wordBreak: "break-all" }}>{value}</div>
                </div>
              ))}
              <div style={{ marginTop: "0.75rem" }}>
                <a
                  className="explorer-link"
                  href={`https://explorer.solana.com/address/${escrow.pda}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Solana Explorer ↗
                </a>
              </div>
            </div>

            {/* ── Revision note (visible to both parties) ── */}
            {escrow.revisionNote && (escrow.status === "revisionRequested") && (
              <div className="card" style={{ marginBottom: "1rem", border: "1px solid rgba(249,115,22,0.25)" }}>
                <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--orange)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Revision Requested</h2>
                <p style={{ fontSize: "0.9rem", color: "#e2e8f0", lineHeight: 1.6 }}>{escrow.revisionNote}</p>
              </div>
            )}

            {/* ── Work submission ── */}
            {submission && (
              <div className="card" style={{ marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Work Submitted</h2>
                <p style={{ fontSize: "0.9rem", color: "#e2e8f0", lineHeight: 1.6 }}>{submission.note}</p>
                {submission.file && (
                  <div style={{ marginTop: "1rem" }}>
                    <a
                      className="btn-download"
                      href={submission.file}
                      download={submission.name}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ↓ {submission.name || "Download Deliverable"}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* ── Client: approve + revision ── */}
            {isClient && escrow.status === "submitted" && (
              <div className="card" style={{ marginBottom: "1rem", border: "1px solid rgba(20,241,149,0.2)" }}>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem" }}>Review Delivery</h2>
                <p style={{ fontSize: "0.87rem", color: "#94a3b8", marginBottom: "1rem" }}>Approve to release payment, or request changes from the freelancer.</p>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  <button className="btn btn-success" onClick={handleApprove} disabled={loading}>
                    {loading ? <><span className="spinner" /> Processing…</> : "✓ Approve & Release Payment"}
                  </button>
                  <button
                    className="btn"
                    style={{ background: "rgba(249,115,22,0.12)", color: "var(--orange)", border: "1px solid rgba(249,115,22,0.3)" }}
                    onClick={() => setShowRevision((s) => !s)}
                    disabled={loading}
                  >
                    {showRevision ? "Cancel" : "↩ Request Revision"}
                  </button>
                </div>

                {showRevision && (
                  <form onSubmit={handleRequestRevision} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
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
                      className="btn"
                      style={{ marginTop: "0.75rem", background: "rgba(249,115,22,0.12)", color: "var(--orange)", border: "1px solid rgba(249,115,22,0.3)" }}
                      disabled={loading || !revMsg.trim()}
                    >
                      {loading ? <><span className="spinner" /> Sending…</> : "Send Revision Request"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ── Client: cancel (only when Active) ── */}
            {isClient && escrow.status === "active" && (
              <div className="card" style={{ marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem" }}>Cancel Escrow</h2>
                <p style={{ fontSize: "0.87rem", color: "#94a3b8", marginBottom: "1rem" }}>Cancel the contract and refund the SOL to your wallet.</p>
                <button className="btn btn-danger" onClick={handleCancel} disabled={loading}>
                  {loading ? <><span className="spinner" /> Processing…</> : "✕ Cancel & Refund"}
                </button>
              </div>
            )}

            {/* ── Freelancer: submit / resubmit ── */}
            {isFreelancer && canFreelancerSubmit && (
              <div className="card" style={{ marginBottom: "1rem", border: "1px solid rgba(153,69,255,0.2)" }}>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                  {escrow.status === "revisionRequested" ? "Resubmit Your Work" : "Submit Your Work"}
                </h2>
                <p style={{ fontSize: "0.87rem", color: "#94a3b8", marginBottom: "1rem" }}>
                  {escrow.status === "revisionRequested"
                    ? "Address the client's feedback, attach the updated file, and resubmit."
                    : "Once you submit, the client will review and release payment."}
                </p>
                <form onSubmit={handleSubmitWork}>
                  <textarea
                    className="form-textarea"
                    value={submitNote}
                    onChange={(e) => setSubmitNote(e.target.value)}
                    placeholder="Describe deliverables, include GitHub URLs, hosted links, Figma, etc."
                    required
                  />

                  <div className="file-attach">
                    <input
                      type="file"
                      ref={submitFileRef}
                      style={{ display: "none" }}
                      onChange={(e) => setSubmitFile(e.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => submitFileRef.current?.click()}
                      disabled={uploading}
                    >
                      📎 Attach File
                    </button>
                    {submitFile && (
                      <>
                        <span className="file-name">{submitFile.name}</span>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: "4px 8px", fontSize: "0.75rem", flexShrink: 0 }}
                          onClick={() => { setSubmitFile(null); if (submitFileRef.current) submitFileRef.current.value = ""; }}
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ marginTop: "0.75rem" }}
                    disabled={loading || uploading || !submitNote.trim()}
                  >
                    {uploading
                      ? <><span className="spinner" /> Uploading…</>
                      : loading
                      ? <><span className="spinner" /> Submitting…</>
                      : escrow.status === "revisionRequested" ? "Resubmit Work On-Chain" : "Submit Work On-Chain"}
                  </button>
                </form>
              </div>
            )}

            {escrow.status === "completed" && (
              <div className="card" style={{ border: "1px solid rgba(20,241,149,0.25)", textAlign: "center", padding: "2rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚡</div>
                <h2 style={{ color: "#14F195", fontWeight: 700 }}>Contract Complete</h2>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "0.5rem" }}>Payment was released to the freelancer&apos;s wallet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
