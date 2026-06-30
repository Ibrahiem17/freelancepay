import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  ArrowLeft, Send, CheckCircle, XCircle, Clock,
  Briefcase, Star, ChevronDown, ChevronUp,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useAuthContext } from "@/pages/_app";
import useSolPrice from "@/hooks/useSolPrice";

const STATUS_LABEL = { OPEN: "Open", FILLED: "Filled", CLOSED: "Closed" };
const STATUS_CLASS  = { OPEN: "badge-active", FILLED: "badge-submitted", CLOSED: "badge-cancelled" };
const APP_CLASS     = { PENDING: "badge-submitted", ACCEPTED: "badge-completed", REJECTED: "badge-cancelled" };

function truncWallet(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Avatar({ name, avatarUrl, size = 36 }) {
  const letter = (name || "?")[0].toUpperCase();
  const hue    = ((name || "A").charCodeAt(0) * 37) % 360;
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--line)", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: `hsl(${hue},55%,78%)`, border: "2px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 800, color: "var(--ink)",
        fontFamily: "var(--font-display)", flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}

function ApplicationCard({ app, onAction, actionLoading }) {
  const { freelancer, proposal, status, createdAt } = app;
  const name = freelancer.displayName || truncWallet(freelancer.walletAddress);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <Avatar name={name} avatarUrl={freelancer.avatarUrl} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/profile/${freelancer.walletAddress}`}
            style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--ink)", textDecoration: "none" }}
          >
            {name}
          </Link>
          {freelancer.averageRating != null && (
            <span style={{ marginLeft: 6, fontSize: "0.75rem", fontWeight: 700, color: "var(--amber)", display: "inline-flex", alignItems: "center", gap: 2 }}>
              <Star size={11} fill="var(--amber)" strokeWidth={0} /> {freelancer.averageRating.toFixed(1)}
            </span>
          )}
          <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)", fontWeight: 600, marginTop: 2 }}>
            {relativeTime(createdAt)}
          </div>
        </div>
        <span className={`badge ${APP_CLASS[status] || ""}`} style={{ fontSize: "0.72rem" }}>
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </span>
      </div>

      {freelancer.skills?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.6rem" }}>
          {freelancer.skills.slice(0, 5).map((s) => <span key={s} className="skill-pill" style={{ fontSize: "0.7rem" }}>{s}</span>)}
        </div>
      )}

      <div style={{ marginTop: "0.75rem" }}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem", color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 4, padding: 0 }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? "Hide" : "View"} proposal
        </button>
        {expanded && (
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", lineHeight: 1.6, color: "var(--ink)", fontWeight: 600, background: "var(--cream)", padding: "0.75rem", borderRadius: "var(--r-sm)", border: "1.5px solid var(--line)" }}>
            {proposal}
          </p>
        )}
      </div>

      {status === "PENDING" && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
          <button
            className="btn btn-sm btn-success"
            onClick={() => onAction(app.id, "accept")}
            disabled={actionLoading === app.id}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <CheckCircle size={13} strokeWidth={2.2} />
            {actionLoading === app.id ? "…" : "Accept"}
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => onAction(app.id, "reject")}
            disabled={actionLoading === app.id}
            style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--red)", borderColor: "var(--red)" }}
          >
            <XCircle size={13} strokeWidth={2.2} />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

export default function JobDetailPage() {
  const router   = useRouter();
  const { id }   = router.query;
  const auth     = useAuthContext();
  const user     = auth?.user ?? null;
  const solPrice = useSolPrice();

  const [job,          setJob]          = useState(null);
  const [loadingJob,   setLoadingJob]   = useState(true);
  const [jobError,     setJobError]     = useState("");

  const [applications,    setApplications]    = useState([]);
  const [loadingApps,     setLoadingApps]     = useState(false);
  const [actionLoading,   setActionLoading]   = useState(null);

  const [proposal,   setProposal]   = useState("");
  const [applying,   setApplying]   = useState(false);
  const [applied,    setApplied]    = useState(false);
  const [applyError, setApplyError] = useState("");

  const [closing,    setClosing]    = useState(false);

  const isOwner = user && job && job.clientWallet === user.walletAddress;

  const fetchJob = useCallback(async () => {
    if (!id) return;
    setLoadingJob(true);
    setJobError("");
    try {
      const res  = await fetch(`/api/jobs/${id}`);
      const data = await res.json();
      if (!res.ok) { setJobError(data.error || "Job not found"); return; }
      setJob(data.job);
    } catch {
      setJobError("Network error — please try again.");
    } finally {
      setLoadingJob(false);
    }
  }, [id]);

  const fetchApplications = useCallback(async () => {
    if (!id || !user) return;
    setLoadingApps(true);
    try {
      const res  = await fetch(`/api/jobs/${id}/applications`);
      if (!res.ok) return;
      const data = await res.json();
      setApplications(data.applications || []);
    } catch {
      /* silent */
    } finally {
      setLoadingApps(false);
    }
  }, [id, user]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  useEffect(() => {
    if (isOwner) fetchApplications();
  }, [isOwner, fetchApplications]);

  async function handleApply(e) {
    e.preventDefault();
    if (!proposal.trim()) return;
    setApplying(true);
    setApplyError("");
    try {
      const res  = await fetch(`/api/jobs/${id}/apply`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ proposal }),
      });
      const data = await res.json();
      if (!res.ok) { setApplyError(data.error || "Failed to apply"); return; }
      setApplied(true);
      setProposal("");
    } catch {
      setApplyError("Network error — please try again.");
    } finally {
      setApplying(false);
    }
  }

  async function handleApplicationAction(appId, action) {
    setActionLoading(appId);
    try {
      const res = await fetch(`/api/jobs/${id}/applications`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ appId, action }),
      });
      if (res.ok) {
        fetchJob();
        fetchApplications();
      }
    } catch {
      /* silent */
    } finally {
      setActionLoading(null);
    }
  }

  async function handleClose() {
    if (!confirm("Close this job? It will no longer accept applications.")) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (res.ok) fetchJob();
    } catch {
      /* silent */
    } finally {
      setClosing(false);
    }
  }

  if (loadingJob) {
    return (
      <Layout title="Job">
        <div className="page" style={{ textAlign: "center", paddingTop: "4rem" }}>
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  if (jobError || !job) {
    return (
      <Layout title="Job Not Found">
        <div className="page" style={{ textAlign: "center", paddingTop: "4rem" }}>
          <Briefcase size={48} style={{ color: "var(--ink-soft)", marginBottom: "1rem" }} />
          <h2 style={{ fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>Job not found</h2>
          <p style={{ color: "var(--ink-soft)", fontWeight: 600 }}>{jobError || "This job doesn't exist or has been removed."}</p>
          <Link href="/jobs" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ArrowLeft size={14} /> Back to Jobs
          </Link>
        </div>
      </Layout>
    );
  }

  const clientName = job.client?.displayName || truncWallet(job.client?.walletAddress);
  const canApply   = user && !isOwner && job.status === "OPEN" && !applied;

  return (
    <Layout title={job.title}>
      <div className="page" style={{ maxWidth: 720 }}>

        {/* ── Back link ── */}
        <Link href="/jobs" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--ink-soft)", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", marginBottom: "1.5rem" }}>
          <ArrowLeft size={14} strokeWidth={2.2} /> Back to Jobs
        </Link>

        {/* ── Header card ── */}
        <div className="card" style={{ padding: "1.5rem 1.75rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h2)", fontWeight: 700, margin: 0 }}>
              {job.title}
            </h1>
            <span className={`badge ${STATUS_CLASS[job.status] || ""}`}>
              {STATUS_LABEL[job.status] || job.status}
            </span>
          </div>

          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Avatar name={clientName} avatarUrl={job.client?.avatarUrl} size={28} />
              <Link href={`/profile/${job.client?.walletAddress}`} style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--ink)", textDecoration: "none" }}>
                {clientName}
              </Link>
            </div>
            <span style={{ color: "var(--ink-soft)", fontSize: "0.8rem", fontWeight: 600 }}>
              <Clock size={12} style={{ verticalAlign: "middle", marginRight: 3 }} />
              {relativeTime(job.createdAt)}
            </span>
            {job.expiresAt && (
              <span style={{ color: "var(--ink-soft)", fontSize: "0.8rem", fontWeight: 600 }}>
                Expires {new Date(job.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Budget */}
          <div style={{ display: "inline-flex", alignItems: "baseline", gap: "0.5rem", background: "var(--lav-lo)", border: "2px solid var(--lav)", borderRadius: "var(--r-sm)", padding: "6px 14px" }}>
            <span className="amount" style={{ fontSize: "1.3rem" }}>{job.budgetSOL} SOL</span>
            {solPrice && (
              <span style={{ fontSize: "0.78rem", color: "var(--ink-soft)", fontWeight: 600 }}>
                ≈ ${(parseFloat(job.budgetSOL) * solPrice).toFixed(0)} USD
              </span>
            )}
          </div>
        </div>

        {/* ── Description ── */}
        <div className="card" style={{ padding: "1.5rem 1.75rem", marginBottom: "1rem" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Description</h2>
          <p style={{ lineHeight: 1.7, fontWeight: 600, color: "var(--ink)", margin: 0, whiteSpace: "pre-wrap" }}>{job.description}</p>
        </div>

        {/* ── Skills ── */}
        {job.requiredSkills?.length > 0 && (
          <div className="card" style={{ padding: "1.5rem 1.75rem", marginBottom: "1rem" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Required Skills</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {job.requiredSkills.map((s) => <span key={s} className="skill-pill">{s}</span>)}
            </div>
          </div>
        )}

        {/* ── Owner controls ── */}
        {isOwner && job.status === "OPEN" && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
            <button
              className="btn btn-sm btn-outline"
              onClick={handleClose}
              disabled={closing}
              style={{ color: "var(--red)", borderColor: "var(--red)" }}
            >
              {closing ? "Closing…" : "Close Job"}
            </button>
          </div>
        )}

        {/* ── Apply form ── */}
        {!user && job.status === "OPEN" && (
          <div className="card" style={{ padding: "1.5rem 1.75rem", marginBottom: "1rem", textAlign: "center" }}>
            <p style={{ fontWeight: 600, color: "var(--ink-soft)", marginBottom: "1rem" }}>Connect your wallet to apply for this job.</p>
            <Link href="/" className="btn btn-primary">Connect Wallet →</Link>
          </div>
        )}

        {applied && (
          <div style={{ background: "var(--sage-lo)", border: "2px solid var(--leaf)", borderRadius: "var(--r-sm)", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--ink)", fontWeight: 700, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CheckCircle size={16} style={{ color: "var(--leaf)" }} /> Your proposal was submitted! The client will review it.
          </div>
        )}

        {canApply && (
          <div className="card" style={{ padding: "1.5rem 1.75rem", marginBottom: "1rem" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Apply for this Job</h2>
            <form onSubmit={handleApply}>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">
                  Your proposal <span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>(10–1000 chars)</span>
                </label>
                <textarea
                  className="form-input"
                  rows={5}
                  value={proposal}
                  onChange={(e) => setProposal(e.target.value)}
                  placeholder="Describe your experience, approach, and why you're the right fit for this project…"
                  minLength={10}
                  maxLength={1000}
                  required
                  style={{ resize: "vertical" }}
                />
                <div className="form-hint">{proposal.length}/1000</div>
              </div>
              {applyError && (
                <div style={{ background: "var(--pink-lo)", border: "2px solid var(--red)", borderRadius: "var(--r-sm)", padding: "0.6rem 1rem", marginBottom: "0.75rem", color: "var(--red)", fontWeight: 700, fontSize: "0.875rem" }}>
                  {applyError}
                </div>
              )}
              <button className="btn btn-primary" type="submit" disabled={applying || !proposal.trim()}>
                <Send size={14} strokeWidth={2.2} />
                {applying ? "Submitting…" : "Submit Proposal"}
              </button>
            </form>
          </div>
        )}

        {/* ── Applications (owner only) ── */}
        {isOwner && (
          <div style={{ marginBottom: "1rem" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.75rem" }}>
              Applications{" "}
              <span style={{ color: "var(--ink-soft)", fontWeight: 600, fontSize: "0.85rem" }}>
                ({applications.length})
              </span>
            </h2>

            {loadingApps ? (
              <div style={{ textAlign: "center", padding: "2rem" }}><div className="spinner" /></div>
            ) : applications.length === 0 ? (
              <div className="card" style={{ padding: "1.5rem", textAlign: "center", color: "var(--ink-soft)", fontWeight: 600 }}>
                No applications yet. Share this job to attract freelancers.
              </div>
            ) : (
              applications.map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  onAction={handleApplicationAction}
                  actionLoading={actionLoading}
                />
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
