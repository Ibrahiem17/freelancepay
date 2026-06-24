import { useRouter } from "next/router";
import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { Check, X, RotateCcw, Paperclip, Download, Zap } from "lucide-react";
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);
import Link from "next/link";
import Layout from "@/components/Layout";
import Toast from "@/components/Toast";
import StarRating from "@/components/StarRating";
import { useEscrow } from "@/src/hooks/useEscrow";
import { uploadToIPFS, parseSubmission } from "@/utils/ipfs";

const SYNC_DELAY = 2500;

const STATUS_DOWN = {
  ACTIVE: "active", SUBMITTED: "submitted", COMPLETED: "completed",
  CANCELLED: "cancelled", REVISION_REQUESTED: "revisionRequested",
};

function normalizeApiEscrow(data) {
  const e  = data.escrow;
  const ws = e.workSubmission;
  return {
    pda:           e.pda,
    client:        e.clientWallet,
    freelancer:    e.freelancerWallet,
    amount:        Number(e.amountLamports),
    title:         e.title,
    description:   e.description,
    workSubmission: ws && typeof ws === "object"
      ? JSON.stringify(ws)
      : (ws || ""),
    revisionNote:  e.revisionNote || "",
    status:        STATUS_DOWN[e.status] || "active",
    createdAt:     Math.floor(new Date(e.onChainCreatedAt).getTime() / 1000),
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

const TIMELINE = ["active", "submitted", "completed"];

// ── Inline review components ──────────────────────────────────────────────────

function ReviewForm({ escrowPda, onSuccess }) {
  const [rating,     setRating]     = useState(0);
  const [comment,    setComment]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [shakeKey,   setShakeKey]   = useState(0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!rating) {
      setShakeKey((k) => k + 1);
      setError("Please select a rating before submitting.");
      return;
    }
    if (comment.trim().length < 10) {
      setError("Comment must be at least 10 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ escrowPda, rating, comment: comment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit review.");
      } else {
        onSuccess(data.review);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" data-reveal="pop" style={{ marginBottom: "1rem", border: "3px dashed var(--lav)" }}>
      <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>
        Leave a Review
      </h2>
      <p style={{ fontSize: "0.87rem", color: "var(--ink-soft)", marginBottom: "1.25rem", fontWeight: 600 }}>
        How was your experience working with this freelancer?
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Rating *</label>
          <div key={shakeKey} className={shakeKey ? "review-shake" : ""} style={{ paddingBottom: 4 }}>
            <StarRating value={rating} size="lg" interactive onChange={setRating} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Comment *</label>
          <textarea
            className="form-textarea"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Describe your experience — was work delivered on time? Quality of communication? Would you hire again?"
            maxLength={500}
            rows={4}
            required
          />
          <div className="form-hint">{comment.length}/500</div>
        </div>
        {error && (
          <div className="alert alert-error" style={{ marginBottom: "0.75rem" }}>{error}</div>
        )}
        <button className="btn btn-primary" type="submit" disabled={submitting || !rating}>
          {submitting
            ? <><span className="spinner" /> Submitting…</>
            : "Submit Review"}
        </button>
      </form>
    </div>
  );
}

function ExistingReviewCard({ review }) {
  return (
    <div className="card" data-reveal style={{ marginBottom: "1rem", border: "3px dashed var(--sage)" }}>
      <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem", fontFamily: "var(--font-display)", color: "var(--leaf)" }}>
        Your Review
      </h2>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <StarRating value={review.rating} size="md" />
        <span style={{ fontWeight: 700, color: "var(--ink)", fontSize: "1rem" }}>{review.rating}/5</span>
      </div>
      <p style={{ fontSize: "0.9rem", color: "var(--ink)", lineHeight: 1.65, fontWeight: 600 }}>
        {review.comment}
      </p>
      <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: "0.5rem", fontWeight: 600 }}>
        Submitted {new Date(review.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function EscrowDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { publicKey } = useWallet();
  const { approveWork, cancelEscrow, submitWork, requestRevision } = useEscrow();

  const [escrow, setEscrow]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [syncing, setSyncing]           = useState(false);
  const [toast, setToast]               = useState(null);
  const [submitNote, setSubmitNote]     = useState("");
  const [submitFile, setSubmitFile]     = useState(null);
  const [uploading, setUploading]       = useState(false);
  const submitFileRef                   = useRef(null);
  const [showRevision, setShowRevision] = useState(false);
  const [revMsg, setRevMsg]             = useState("");
  const [review,       setReview]       = useState(null);
  const [reviewLoaded, setReviewLoaded] = useState(false);

  const clearToast = useCallback(() => setToast(null), []);

  // Load escrow + review from DB API (fast path); falls back to chain if not indexed yet
  const reload = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/escrows/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setEscrow(normalizeApiEscrow(data));
      setReview(data.review || null);
      setReviewLoaded(true);
    } catch {
      // silently fail — page shows "loading" state
    }
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  async function syncAfter(msg, signature) {
    setToast({ type: "success", text: msg, signature });
    setSyncing(true);
    await new Promise((r) => setTimeout(r, SYNC_DELAY));
    await reload();
    setSyncing(false);
  }

  async function handleApprove() {
    setLoading(true);
    const r = await approveWork(escrow.pda, escrow.freelancer);
    if (r.success) {
      await syncAfter("Work approved! SOL sent to freelancer.", r.signature);
    } else {
      setToast({ type: "error", text: r.error });
    }
    setLoading(false);
  }

  async function handleCancel() {
    setLoading(true);
    const r = await cancelEscrow(escrow.pda);
    if (r.success) {
      await syncAfter("Escrow cancelled. SOL refunded.", r.signature);
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
      setRevMsg("");
      setShowRevision(false);
      await syncAfter("Revision requested. The freelancer can see your feedback.", r.signature);
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
      ipfsUrl  = result.url;
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
      setSubmitNote("");
      setSubmitFile(null);
      if (submitFileRef.current) submitFileRef.current.value = "";
      await syncAfter("Work submitted on-chain!", r.signature);
    } else {
      setToast({ type: "error", text: r.error });
    }
    setLoading(false);
  }

  const isClient            = escrow && publicKey && escrow.client     === publicKey.toBase58();
  const isFreelancer        = escrow && publicKey && escrow.freelancer === publicKey.toBase58();
  const isCancelled         = escrow?.status === "cancelled";
  const canFreelancerSubmit = escrow?.status === "active" || escrow?.status === "revisionRequested";
  const submission          = escrow?.workSubmission ? parseSubmission(escrow.workSubmission) : null;

  return (
    <Layout title="Escrow Detail">
      <Toast msg={toast} onClose={clearToast} />
      <div className="page">

        {/* ── Breadcrumb ── */}
        <div style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--ink-soft)" }}>
          <Link href="/" style={{ color: "var(--ink-soft)" }}>Home</Link>
          {isClient     && <><span>›</span><Link href="/client"     style={{ color: "var(--ink-soft)" }}>My Escrows</Link></>}
          {isFreelancer && <><span>›</span><Link href="/freelancer" style={{ color: "var(--ink-soft)" }}>My Contracts</Link></>}
          {escrow && <><span>›</span><span style={{ color: "var(--ink)" }}>{escrow.title}</span></>}
        </div>

        {/* ── Sync indicator ── */}
        {syncing && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1rem", background: "var(--sage-lo)", border: "2.5px solid var(--line)", borderRadius: "var(--r-md)", marginBottom: "1rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--leaf)" }}>
            <span className="spinner" style={{ width: 14, height: 14 }} />
            Syncing with blockchain…
          </div>
        )}

        {!publicKey ? (
          <div className="empty-state">
            <p style={{ marginBottom: "1rem" }}>Connect your wallet to view this escrow.</p>
            <WalletMultiButton />
          </div>
        ) : !escrow ? (
          <div className="empty-state">Loading escrow data…</div>
        ) : (
          <>
            {/* ── Header card ── */}
            <div className="card" data-enter style={{ marginBottom: "1rem" }}>
              <div className="card-header">
                <div>
                  <h1 style={{ fontSize: "1.4rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--ink)" }}>
                    {escrow.title}
                  </h1>
                  <div style={{ marginTop: 8 }}><StatusBadge status={escrow.status} /></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="card-amount">{(escrow.amount / LAMPORTS).toFixed(4)} SOL</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)", fontWeight: 600, marginTop: 4 }}>locked in escrow</div>
                </div>
              </div>

              {escrow.description && (
                <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "var(--ink-soft)", lineHeight: 1.65, fontWeight: 600 }}>
                  {escrow.description}
                </p>
              )}

              {/* ── Progress timeline ── */}
              {!isCancelled && (
                <div style={{ display: "flex", gap: 0, marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "2.5px dashed var(--line)" }}>
                  {TIMELINE.map((step, i) => {
                    const done    = TIMELINE.indexOf(escrow.status) >= i;
                    const current = escrow.status === step;
                    return (
                      <div key={step} style={{ flex: 1, textAlign: "center", position: "relative" }}>
                        {i > 0 && (
                          <div style={{
                            position: "absolute", top: 10, right: "50%", left: "-50%",
                            height: 3, borderRadius: 2,
                            background: done ? "var(--sage)" : "var(--line)",
                          }} />
                        )}
                        <div style={{
                          width: 22, height: 22, borderRadius: "50%",
                          margin: "0 auto 6px",
                          background: done ? "var(--sage)" : "var(--line)",
                          border: current ? "3px solid var(--leaf)" : "2.5px solid var(--ink)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.7rem", fontWeight: 800,
                          color: done ? "var(--ink)" : "var(--ink-soft)",
                          position: "relative", zIndex: 1,
                          fontFamily: "var(--font-body)",
                        }}>
                          {done
                            ? <Check size={11} strokeWidth={2.8} aria-hidden />
                            : i + 1}
                        </div>
                        <div style={{
                          fontSize: "0.72rem", fontWeight: 700,
                          color: done ? "var(--leaf)" : "var(--ink-soft)",
                          textTransform: "capitalize",
                          fontFamily: "var(--font-display)",
                        }}>
                          {step}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Contract details ── */}
            <div className="card" data-reveal style={{ marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "0.85rem", fontWeight: 800, marginBottom: "1rem", color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-body)" }}>
                Contract Details
              </h2>
              {[
                ["PDA Address", escrow.pda],
                ["Client",      escrow.client],
                ["Freelancer",  escrow.freelancer],
                ["Created",     new Date(escrow.createdAt * 1000).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", padding: "8px 0", borderBottom: "2px dashed var(--line)", gap: "1rem" }}>
                  <div style={{ minWidth: 90, color: "var(--ink-soft)", fontSize: "0.82rem", fontWeight: 600 }}>{label}</div>
                  <div className="mono" style={{ fontSize: "0.8rem", color: "var(--ink-soft)", wordBreak: "break-all" }}>{value}</div>
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

            {/* ── Revision note ── */}
            {escrow.revisionNote && escrow.status === "revisionRequested" && (
              <div className="card" data-reveal style={{ marginBottom: "1rem", border: "3px dashed rgba(201,116,74,0.45)" }}>
                <h2 style={{ fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.75rem", color: "var(--orange)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-body)" }}>
                  Revision Requested
                </h2>
                <p style={{ fontSize: "0.9rem", color: "var(--ink)", lineHeight: 1.65, fontWeight: 600 }}>{escrow.revisionNote}</p>
              </div>
            )}

            {/* ── Work submission ── */}
            {submission && (
              <div className="card" data-reveal style={{ marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.75rem", color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-body)" }}>
                  Work Submitted
                </h2>
                <p style={{ fontSize: "0.9rem", color: "var(--ink)", lineHeight: 1.65, fontWeight: 600 }}>{submission.note}</p>
                {submission.file && (
                  <div style={{ marginTop: "1rem" }}>
                    <a
                      className="btn-download"
                      href={submission.file}
                      download={submission.name}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download size={13} strokeWidth={2.2} className="icon" aria-hidden />
                      {submission.name || "Download Deliverable"}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* ── Client: approve + revision ── */}
            {isClient && escrow.status === "submitted" && (
              <div className="card" data-reveal style={{ marginBottom: "1rem", border: "3px dashed var(--sage)" }}>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>
                  Review Delivery
                </h2>
                <p style={{ fontSize: "0.87rem", color: "var(--ink-soft)", marginBottom: "1rem", fontWeight: 600 }}>
                  Approve to release payment, or request changes from the freelancer.
                </p>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  <button className="btn btn-success" onClick={handleApprove} disabled={loading}>
                    {loading
                      ? <><span className="spinner" /> Processing…</>
                      : <><Check size={15} strokeWidth={2.2} className="icon" aria-hidden /> Approve &amp; Release Payment</>}
                  </button>
                  <button
                    className="btn"
                    style={{ background: "var(--peach-lo)", color: "var(--orange)", border: "2.5px solid var(--orange)" }}
                    onClick={() => setShowRevision((s) => !s)}
                    disabled={loading}
                  >
                    {showRevision
                      ? <><X size={14} strokeWidth={2.2} className="icon" aria-hidden /> Cancel</>
                      : <><RotateCcw size={14} strokeWidth={2.2} className="icon" aria-hidden /> Request Revision</>}
                  </button>
                </div>

                {showRevision && (
                  <form onSubmit={handleRequestRevision} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "2.5px dashed var(--line)" }}>
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
                      style={{ marginTop: "0.75rem", background: "var(--peach-lo)", color: "var(--orange)", border: "2.5px solid var(--orange)" }}
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
              <div className="card" data-reveal style={{ marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>
                  Cancel Escrow
                </h2>
                <p style={{ fontSize: "0.87rem", color: "var(--ink-soft)", marginBottom: "1rem", fontWeight: 600 }}>
                  Cancel the contract and refund the SOL to your wallet.
                </p>
                <button className="btn btn-danger" onClick={handleCancel} disabled={loading}>
                  {loading
                    ? <><span className="spinner" /> Processing…</>
                    : <><X size={15} strokeWidth={2.2} className="icon" aria-hidden /> Cancel &amp; Refund</>}
                </button>
              </div>
            )}

            {/* ── Freelancer: submit / resubmit ── */}
            {isFreelancer && canFreelancerSubmit && (
              <div className="card" data-reveal style={{ marginBottom: "1rem", border: "3px dashed var(--lav)" }}>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>
                  {escrow.status === "revisionRequested" ? "Resubmit Your Work" : "Submit Your Work"}
                </h2>
                <p style={{ fontSize: "0.87rem", color: "var(--ink-soft)", marginBottom: "1rem", fontWeight: 600 }}>
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
                      <Paperclip size={13} strokeWidth={2.2} className="icon" aria-hidden />
                      Attach File
                    </button>
                    {submitFile && (
                      <>
                        <span className="file-name">{submitFile.name}</span>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: "4px 8px", fontSize: "0.75rem", flexShrink: 0 }}
                          onClick={() => { setSubmitFile(null); if (submitFileRef.current) submitFileRef.current.value = ""; }}
                          aria-label="Remove file"
                        >
                          <X size={12} strokeWidth={2.2} aria-hidden />
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

            {/* ── Completed state ── */}
            {escrow.status === "completed" && (
              <div
                className="card"
                data-reveal="pop"
                style={{ border: "3px dashed var(--leaf)", textAlign: "center", padding: "2.5rem", background: "var(--sage-lo)", marginBottom: "1rem" }}
              >
                <div className="icon-badge icon-badge--paid" style={{ margin: "0 auto 1rem" }}>
                  <Zap size={22} strokeWidth={2.2} aria-hidden />
                </div>
                <h2 style={{ color: "var(--leaf)", fontWeight: 700, fontFamily: "var(--font-display)", fontSize: "1.6rem" }}>
                  Contract Complete
                </h2>
                <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginTop: "0.5rem", fontWeight: 600 }}>
                  Payment was released to the freelancer&apos;s wallet.
                </p>
              </div>
            )}

            {/* ── Review section (client only, after completion) ── */}
            {escrow.status === "completed" && isClient && reviewLoaded && (
              review
                ? <ExistingReviewCard review={review} />
                : <ReviewForm escrowPda={escrow.pda} onSuccess={setReview} />
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
