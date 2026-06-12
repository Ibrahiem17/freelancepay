import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { Wallet, FileText, Zap, PenLine, X, Paperclip, RefreshCw, Download } from "lucide-react";
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

function EscrowCard({ escrow, onSubmitWork, onError, busy }) {
  const [showForm, setShowForm]     = useState(false);
  const [note, setNote]             = useState("");
  const [file, setFile]             = useState(null);
  const [uploading, setUploading]   = useState(false);
  const fileInputRef                = useRef(null);
  const sol    = (escrow.amount / LAMPORTS).toFixed(4);
  const parsed = parseSubmission(escrow.workSubmission);
  const canSubmit = escrow.status === "active" || escrow.status === "revisionRequested";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!note.trim()) return;

    let ipfsUrl = null, fileName = null;
    if (file) {
      setUploading(true);
      const result = await uploadToIPFS(file);
      setUploading(false);
      if (result.error) { onError(result.error); return; }
      ipfsUrl  = result.url;
      fileName = result.name;
    }

    let trimmedNote = note.trim();
    let encoded = JSON.stringify({ note: trimmedNote, file: ipfsUrl, name: fileName });
    while (encoded.length > 500 && trimmedNote.length > 0) {
      trimmedNote = trimmedNote.slice(0, -1);
      encoded = JSON.stringify({ note: trimmedNote, file: ipfsUrl, name: fileName });
    }

    await onSubmitWork(escrow.pda, encoded);
    setNote("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(false);
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
        Client &nbsp;
        <span className="mono" style={{ color: "var(--ink-soft)" }}>{escrow.client.slice(0, 16)}…{escrow.client.slice(-8)}</span>
      </div>

      {escrow.status === "revisionRequested" && escrow.revisionNote && (
        <div className="revision-box">
          <strong>Changes requested</strong>
          <p style={{ marginTop: 4, margin: "4px 0 0" }}>{escrow.revisionNote}</p>
        </div>
      )}

      {escrow.workSubmission && (
        <div className="work-box">
          <strong>Your submission</strong>
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

      {escrow.status === "completed" && (
        <div style={{ marginTop: "0.75rem", color: "var(--leaf)", fontSize: "0.9rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Zap size={15} strokeWidth={2.2} className="icon" aria-hidden />
          Payment released to your wallet
        </div>
      )}

      <div className="btn-row">
        <Link href={`/escrow/${escrow.pda}`} className="btn btn-outline btn-sm">View Details</Link>

        {canSubmit && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowForm((s) => !s)}
          >
            {showForm
              ? <><X size={13} strokeWidth={2.2} className="icon" aria-hidden /> Cancel</>
              : escrow.status === "revisionRequested"
              ? <><PenLine size={13} strokeWidth={2.2} className="icon" aria-hidden /> Resubmit Work</>
              : <><PenLine size={13} strokeWidth={2.2} className="icon" aria-hidden /> Submit Work</>}
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

      {canSubmit && showForm && (
        <form onSubmit={handleSubmit} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "2.5px dashed var(--line)" }}>
          <label className="form-label">
            {escrow.status === "revisionRequested" ? "Updated work description / delivery link" : "Work description / delivery link"}
          </label>
          <textarea
            className="form-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe what you delivered, include links to GitHub, Figma, hosted URLs…"
            required
          />

          <div className="file-attach">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Paperclip size={13} strokeWidth={2.2} className="icon" aria-hidden />
              Attach File
            </button>
            {file && (
              <>
                <span className="file-name">{file.name}</span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ padding: "4px 8px", fontSize: "0.75rem", flexShrink: 0 }}
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  aria-label="Remove file"
                >
                  <X size={12} strokeWidth={2.2} aria-hidden />
                </button>
              </>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-sm"
            style={{ marginTop: "0.6rem" }}
            disabled={busy || uploading || !note.trim()}
          >
            {uploading
              ? <><span className="spinner" /> Uploading…</>
              : busy
              ? <><span className="spinner" /> Submitting…</>
              : escrow.status === "revisionRequested" ? "Resubmit Work On-Chain" : "Submit Work On-Chain"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function FreelancerPage() {
  const { publicKey } = useWallet();
  const { submitWork, fetchMyEscrowsAsFreelancer } = useEscrow();

  const [escrows, setEscrows]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(false);
  const [toast, setToast]       = useState(null);
  const clearToast = useCallback(() => setToast(null), []);

  const loadEscrows = useCallback(async () => {
    if (!publicKey) return;
    setFetching(true);
    const data = await fetchMyEscrowsAsFreelancer();
    setEscrows(data.sort((a, b) => b.createdAt - a.createdAt));
    setFetching(false);
  }, [publicKey, fetchMyEscrowsAsFreelancer]);

  useEffect(() => { loadEscrows(); }, [loadEscrows]);

  async function handleSubmitWork(pda, encodedDescription) {
    setLoading(true);
    const r = await submitWork(pda, encodedDescription);
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
          <h1 data-enter style={{ fontSize: "var(--fs-h2)", fontWeight: 700, fontFamily: "var(--font-display)" }}>
            Freelancer Dashboard
          </h1>
          <p style={{ marginTop: 4, fontSize: "0.9rem", color: "var(--ink-soft)", fontWeight: 600 }}>
            View contracts assigned to your wallet and submit work.
          </p>
        </div>

        {!publicKey ? (
          <div className="empty-state">
            <div className="icon-badge icon-badge--lav" style={{ margin: "0 auto 0.75rem" }}>
              <Wallet size={22} strokeWidth={2} aria-hidden />
            </div>
            <p style={{ marginBottom: "1rem" }}>Connect your wallet to view your contracts.</p>
            <WalletMultiButton />
          </div>
        ) : (
          <>
            {escrows.length > 0 && (
              <div
                data-reveal="zoom"
                style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "var(--line)", borderRadius: "var(--r-md)", overflow: "hidden", border: "2.5px solid var(--line)", marginBottom: "1.5rem" }}
              >
                {[
                  { label: "Active",           count: activeCount,    color: "var(--sky)"    },
                  { label: "Pending approval",  count: submittedCount, color: "var(--butter)" },
                  { label: "Completed",         count: completedCount, color: "var(--sage)"   },
                ].map(({ label, count, color }) => (
                  <div key={label} style={{ background: "var(--paper)", padding: "1rem", textAlign: "center" }}>
                    <div className="amount" style={{ fontSize: "1.5rem", color }}>{count}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)", marginTop: 2, fontWeight: 600 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="section-header">
              <h2 className="section-title">My Contracts</h2>
              <button className="btn btn-outline btn-sm" onClick={loadEscrows} disabled={fetching} aria-label="Refresh">
                {fetching
                  ? <span className="spinner" />
                  : <><RefreshCw size={13} strokeWidth={2.2} className="icon" aria-hidden /> Refresh</>}
              </button>
            </div>

            {escrows.length === 0 ? (
              <div className="empty-state">
                <div className="icon-badge" style={{ margin: "0 auto 0.75rem" }}>
                  <FileText size={22} strokeWidth={2} aria-hidden />
                </div>
                {fetching ? "Loading contracts…" : "No contracts assigned to your wallet yet. Share your wallet address with a client to get started."}
              </div>
            ) : (
              escrows.map((e) => (
                <EscrowCard
                  key={e.pda}
                  escrow={e}
                  onSubmitWork={handleSubmitWork}
                  onError={(msg) => setToast({ type: "error", text: msg })}
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
