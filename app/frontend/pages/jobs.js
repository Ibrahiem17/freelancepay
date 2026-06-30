import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, Briefcase, Send, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuthContext } from "@/pages/_app";

const LIMIT = 15;

const POPULAR_SKILLS = [
  "react", "solana", "rust", "node.js", "python",
  "design", "ui/ux", "writing", "marketing", "video",
];

function truncWallet(addr) {
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

function AvatarFallback({ name, size = 36 }) {
  const initial = (name || "?")[0].toUpperCase();
  const colors  = ["var(--lav)", "var(--sage)", "var(--sky)", "var(--peach)", "var(--butter)"];
  const bg      = colors[initial.charCodeAt(0) % colors.length];
  return (
    <div className="jc-avatar-fallback" style={{ width: size, height: size, background: bg }}>
      {initial}
    </div>
  );
}

function JobCard({ job, currentUserWallet }) {
  const { id, title, description, budgetSOL, requiredSkills, createdAt, client } = job;
  const clientName   = client?.displayName || truncWallet(client.walletAddress);
  const isOwnJob     = currentUserWallet && client.walletAddress === currentUserWallet;

  const [showApply,  setShowApply]  = useState(false);
  const [proposal,   setProposal]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [applied,    setApplied]    = useState(false);
  const [applyError, setApplyError] = useState("");

  async function handleApply(e) {
    e.preventDefault();
    if (!proposal.trim()) return;
    setSubmitting(true);
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
      setShowApply(false);
      setProposal("");
    } catch {
      setApplyError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card jc-card">
      <div className="jc-head">
        <div className="jc-client-info">
          {client?.avatarUrl
            ? <img src={client.avatarUrl} alt={clientName} className="jc-avatar-img" />
            : <AvatarFallback name={clientName} />}
          <span className="jc-client-name">{clientName}</span>
        </div>
        <span className="amount" style={{ fontSize: "1.1rem" }}>{budgetSOL} SOL</span>
      </div>

      <h3 className="jc-title">
        <Link href={`/jobs/${id}`}>{title}</Link>
      </h3>

      <p className="jc-desc">
        {description.length > 160 ? description.slice(0, 160) + "…" : description}
      </p>

      {requiredSkills.length > 0 && (
        <div className="fc-skills" style={{ marginBottom: "0.75rem" }}>
          {requiredSkills.slice(0, 5).map((s) => <span key={s} className="skill-pill">{s}</span>)}
          {requiredSkills.length > 5 && <span className="skill-more">+{requiredSkills.length - 5}</span>}
        </div>
      )}

      <div className="jc-footer">
        <span className="muted" style={{ fontSize: "0.8rem" }}>{relativeTime(createdAt)}</span>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {applied && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8rem", fontWeight: 700, color: "var(--leaf)" }}>
              <CheckCircle size={13} strokeWidth={2.5} /> Applied
            </span>
          )}
          {!isOwnJob && !applied && currentUserWallet && (
            <button
              className={`btn btn-sm ${showApply ? "btn-outline" : "btn-primary"}`}
              onClick={() => setShowApply((s) => !s)}
            >
              {showApply
                ? <><ChevronUp size={13} strokeWidth={2.2} /> Cancel</>
                : <><Send size={13} strokeWidth={2.2} /> Apply</>}
            </button>
          )}
          {!currentUserWallet && (
            <Link href="/" className="btn btn-sm btn-primary">Connect to Apply</Link>
          )}
        </div>
      </div>

      {showApply && (
        <form onSubmit={handleApply} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "2px solid var(--line)" }}>
          <label className="form-label" style={{ marginBottom: "0.4rem", display: "block" }}>
            Your proposal <span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>(tell the client why you're the right fit)</span>
          </label>
          <textarea
            className="form-textarea"
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
            placeholder="Describe your experience, approach, and why you're a great fit for this project…"
            rows={4}
            required
            style={{ marginBottom: "0.6rem" }}
          />
          {applyError && <p style={{ color: "var(--red)", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.5rem" }}>{applyError}</p>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !proposal.trim()}>
            {submitting ? <><span className="spinner" /> Submitting…</> : <><Send size={13} strokeWidth={2.2} /> Submit Proposal</>}
          </button>
        </form>
      )}
    </div>
  );
}

const POSTED_FILTERS = [
  { label: "Any time",    value: "" },
  { label: "Last 24h",    value: "24h" },
  { label: "This week",   value: "week" },
];

export default function JobsPage() {
  const auth    = useAuthContext();
  const isAuth  = !!auth?.user;
  const currentUserWallet = auth?.user?.walletAddress ?? null;

  const [jobs,           setJobs]           = useState([]);
  const [total,          setTotal]          = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [cursor,         setCursor]         = useState(null);
  const [hasMore,        setHasMore]        = useState(false);
  const [query,          setQuery]          = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [minBudget,      setMinBudget]      = useState("");
  const [maxBudget,      setMaxBudget]      = useState("");
  const [postedWithin,   setPostedWithin]   = useState("");

  const debounceRef = useRef(null);

  function buildUrl(nextCursor) {
    const params = new URLSearchParams({ limit: LIMIT });
    if (query.trim())              params.set("q",          query.trim());
    if (selectedSkills.length > 0) params.set("skills",     selectedSkills.join(","));
    if (minBudget)                 params.set("minBudget",  minBudget);
    if (maxBudget)                 params.set("maxBudget",  maxBudget);
    if (nextCursor)                params.set("cursor",     nextCursor);
    return `/api/jobs?${params}`;
  }

  const fetchJobs = useCallback(async (reset = true) => {
    setLoading(true);
    try {
      const res  = await fetch(buildUrl(reset ? null : cursor));
      const data = await res.json();

      let list = data.jobs || [];

      // Client-side posted-within filter (API doesn't have a date filter param)
      if (postedWithin === "24h") {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        list = list.filter((j) => new Date(j.createdAt).getTime() > cutoff);
      } else if (postedWithin === "week") {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        list = list.filter((j) => new Date(j.createdAt).getTime() > cutoff);
      }

      setJobs(reset ? list : (prev) => [...prev, ...list]);
      setTotal(data.total   || 0);
      setHasMore(!!data.nextCursor);
      setCursor(data.nextCursor || null);
    } catch {
      // leave previous results
    } finally {
      setLoading(false);
    }
  }, [query, selectedSkills, minBudget, maxBudget, postedWithin, cursor]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchJobs(true), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, selectedSkills, minBudget, maxBudget, postedWithin]);

  function toggleSkill(skill) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  return (
    <Layout title="Browse Jobs">
      {/* ── Hero ──────────────────────────────────── */}
      <section className="wrap" style={{ paddingTop: "3.5rem", paddingBottom: "2rem", textAlign: "center" }}>
        <div className="eyebrow" style={{ marginBottom: "0.5rem" }}>Job Board</div>
        <h1 style={{ fontFamily: "var(--font-display)", marginBottom: "0.75rem" }}>
          Find Your Next Project
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: "var(--fs-lg)", maxWidth: 480, margin: "0 auto 1.75rem", fontWeight: 600 }}>
          Browse open jobs from clients ready to pay in SOL via escrow.
        </p>

        <div className="mp-search-wrap" style={{ maxWidth: 540, margin: "0 auto" }}>
          <Search size={18} className="mp-search-icon" />
          <input
            className="mp-search-input"
            type="text"
            placeholder="Search jobs by title or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isAuth && (
            <Link href="/post-job" className="btn btn-sm btn-success" style={{ flexShrink: 0 }}>
              + Post Job
            </Link>
          )}
        </div>
      </section>

      <div className="wrap jobs-layout" style={{ paddingBottom: "4rem" }}>
        {/* ── Sidebar filters ───────────────────── */}
        <aside className="jobs-sidebar">
          <div className="jobs-filter-card">
            <div className="jobs-filter-title">Posted within</div>
            <div className="jobs-tab-group">
              {POSTED_FILTERS.map((f) => (
                <button
                  key={f.value}
                  className={`jobs-tab${postedWithin === f.value ? " jobs-tab--active" : ""}`}
                  onClick={() => setPostedWithin(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="jobs-filter-card">
            <div className="jobs-filter-title">Skills</div>
            <div className="mp-skill-pills">
              {POPULAR_SKILLS.map((skill) => (
                <button
                  key={skill}
                  className={`skill-pill skill-pill--toggle${selectedSkills.includes(skill) ? " skill-pill--active" : ""}`}
                  onClick={() => toggleSkill(skill)}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div className="jobs-filter-card">
            <div className="jobs-filter-title">Budget (SOL)</div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Min"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                style={{ width: "100%" }}
              />
              <span>–</span>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Max"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {(selectedSkills.length > 0 || minBudget || maxBudget || postedWithin) && (
            <button
              className="btn btn-sm btn-outline"
              style={{ width: "100%" }}
              onClick={() => { setSelectedSkills([]); setMinBudget(""); setMaxBudget(""); setPostedWithin(""); }}
            >
              Clear all filters
            </button>
          )}
        </aside>

        {/* ── Job list ──────────────────────────── */}
        <main>
          <div style={{ marginBottom: "1rem", color: "var(--ink-soft)", fontSize: "0.875rem", fontWeight: 600 }}>
            {loading && jobs.length === 0 ? "Loading…" : `${total} open job${total !== 1 ? "s" : ""}`}
          </div>

          {!loading && jobs.length === 0 ? (
            <div className="mp-empty">
              <Briefcase size={40} style={{ color: "var(--ink-soft)", marginBottom: "0.75rem" }} />
              <h3 style={{ fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>No jobs found</h3>
              <p style={{ color: "var(--ink-soft)", fontWeight: 600 }}>
                Try different filters, or{" "}
                {isAuth ? <Link href="/post-job">post the first job →</Link> : "check back later."}
              </p>
            </div>
          ) : (
            <div className="jobs-list">
              {jobs.map((j) => <JobCard key={j.id} job={j} currentUserWallet={currentUserWallet} />)}
            </div>
          )}

          {hasMore && !loading && (
            <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
              <button className="btn btn-outline" onClick={() => fetchJobs(false)}>
                Load more
              </button>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}
