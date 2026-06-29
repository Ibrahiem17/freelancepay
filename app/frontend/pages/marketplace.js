import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, Star, SlidersHorizontal, ChevronDown } from "lucide-react";
import Layout from "@/components/Layout";

const LIMIT = 12;

const POPULAR_SKILLS = [
  "react", "solana", "rust", "node.js", "python",
  "design", "ui/ux", "writing", "marketing", "video",
];

const SORT_OPTIONS = [
  { value: "rating",   label: "Best Rated" },
  { value: "earnings", label: "Most Active" },
  { value: "newest",   label: "Newest" },
];

function truncWallet(addr) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function Stars({ rating }) {
  if (rating == null) return <span className="muted" style={{ fontSize: "0.8rem" }}>No reviews yet</span>;
  return (
    <span className="fc-rating">
      <Star size={13} fill="var(--amber)" strokeWidth={0} style={{ color: "var(--amber)", flexShrink: 0 }} />
      <span>{rating.toFixed(1)}</span>
    </span>
  );
}

function AvatarFallback({ name, size = 52 }) {
  const initial = (name || "?")[0].toUpperCase();
  const colors  = ["var(--lav)", "var(--sage)", "var(--sky)", "var(--peach)", "var(--butter)"];
  const bg      = colors[initial.charCodeAt(0) % colors.length];
  return (
    <div className="fc-avatar-fallback" style={{ width: size, height: size, background: bg }}>
      {initial}
    </div>
  );
}

function FreelancerCard({ freelancer }) {
  const {
    walletAddress, displayName, bio, skills,
    hourlyRate, avatarUrl, averageRating, totalReviews, completedJobs,
  } = freelancer;

  const name    = displayName || truncWallet(walletAddress);
  const visible = (skills || []).slice(0, 4);
  const extra   = (skills || []).length - 4;

  return (
    <div className="card fc-card" data-tilt>
      <div className="fc-head">
        <div className="fc-avatar-wrap">
          {avatarUrl
            ? <img src={avatarUrl} alt={name} className="fc-avatar-img" />
            : <AvatarFallback name={name} />}
        </div>
        <div className="fc-identity">
          <div className="fc-name">{name}</div>
          <div className="fc-wallet">{truncWallet(walletAddress)}</div>
        </div>
      </div>

      {bio && (
        <p className="fc-bio">{bio.length > 80 ? bio.slice(0, 80) + "…" : bio}</p>
      )}

      <div className="fc-skills">
        {visible.map((s) => <span key={s} className="skill-pill">{s}</span>)}
        {extra > 0 && <span className="skill-more">+{extra}</span>}
      </div>

      <div className="fc-meta">
        <div className="fc-meta-row">
          <Stars rating={averageRating} />
          {averageRating != null && (
            <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)", fontWeight: 600 }}>
              ({totalReviews})
            </span>
          )}
        </div>
        <div className="fc-meta-row">
          <span className="fc-rate">
            {hourlyRate != null ? `${hourlyRate} SOL/hr` : "Rate negotiable"}
          </span>
          {completedJobs > 0 && (
            <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)", fontWeight: 600 }}>
              {completedJobs} job{completedJobs !== 1 ? "s" : ""} done
            </span>
          )}
        </div>
      </div>

      <div className="btn-row" style={{ marginTop: "0.75rem" }}>
        <Link href={`/profile/${walletAddress}`} className="btn btn-sm btn-outline">
          View Profile
        </Link>
        <Link href={`/client?hire=${walletAddress}`} className="btn btn-sm btn-primary">
          Hire Me
        </Link>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const [freelancers, setFreelancers] = useState([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [hasMore,     setHasMore]     = useState(false);
  const [offset,      setOffset]      = useState(0);

  const [query,          setQuery]          = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [sortBy,         setSortBy]         = useState("rating");
  const [minRate,        setMinRate]        = useState("");
  const [maxRate,        setMaxRate]        = useState("");
  const [showFilters,    setShowFilters]    = useState(false);

  const debounceRef = useRef(null);

  const fetchFreelancers = useCallback(async (newOffset = 0, append = false) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: LIMIT, offset: newOffset });
    if (query.trim())             params.set("q",       query.trim());
    if (selectedSkills.length > 0) params.set("skills",  selectedSkills.join(","));
    if (sortBy !== "rating")      params.set("sortBy",  sortBy);
    if (minRate)                  params.set("minRate", minRate);
    if (maxRate)                  params.set("maxRate", maxRate);

    try {
      const res  = await fetch(`/api/search/freelancers?${params}`);
      const data = await res.json();
      setFreelancers((prev) => append ? [...prev, ...(data.freelancers || [])] : (data.freelancers || []));
      setTotal(data.total   || 0);
      setHasMore(data.hasMore || false);
      setOffset(newOffset);
    } catch {
      // Network error — leave previous results
    } finally {
      setLoading(false);
    }
  }, [query, selectedSkills, sortBy, minRate, maxRate]);

  // Debounced refetch on filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchFreelancers(0, false), 300);
    return () => clearTimeout(debounceRef.current);
  }, [fetchFreelancers]);

  function toggleSkill(skill) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function loadMore() {
    fetchFreelancers(offset + LIMIT, true);
  }

  return (
    <Layout title="Find a Freelancer">
      {/* ── Hero ──────────────────────────────────── */}
      <section className="mp-hero">
        <div className="wrap" style={{ textAlign: "center", paddingTop: "3.5rem", paddingBottom: "2.5rem" }}>
          <div className="eyebrow" style={{ marginBottom: "0.5rem" }}>Marketplace</div>
          <h1 style={{ fontFamily: "var(--font-display)", marginBottom: "0.75rem" }}>
            Find the World's Top Freelancers
          </h1>
          <p style={{ color: "var(--ink-soft)", fontSize: "var(--fs-lg)", maxWidth: 520, margin: "0 auto 1.75rem", fontWeight: 600 }}>
            Browse verified freelancers, filter by skill, and hire with SOL locked in escrow.
          </p>

          <div className="mp-search-wrap">
            <Search size={18} className="mp-search-icon" />
            <input
              className="mp-search-input"
              type="text"
              placeholder="Search by name or bio…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              className="btn btn-sm"
              style={{ flexShrink: 0 }}
              onClick={() => setShowFilters((f) => !f)}
            >
              <SlidersHorizontal size={14} />
              Filters
              {(selectedSkills.length > 0 || minRate || maxRate) && (
                <span className="filter-badge">
                  {selectedSkills.length + (minRate ? 1 : 0) + (maxRate ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ── Filters ──────────────────────────────── */}
      {showFilters && (
        <div className="mp-filters-bar wrap">
          <div className="mp-filter-group">
            <div className="mp-filter-label">Skills</div>
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

          <div className="mp-filter-row">
            <div className="mp-filter-group">
              <div className="mp-filter-label">Sort by</div>
              <div className="mp-select-wrap">
                <select
                  className="mp-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="mp-select-icon" />
              </div>
            </div>

            <div className="mp-filter-group">
              <div className="mp-filter-label">Hourly rate (SOL)</div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="Min"
                  value={minRate}
                  onChange={(e) => setMinRate(e.target.value)}
                  style={{ width: 90 }}
                />
                <span style={{ color: "var(--ink-soft)" }}>–</span>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="Max"
                  value={maxRate}
                  onChange={(e) => setMaxRate(e.target.value)}
                  style={{ width: 90 }}
                />
              </div>
            </div>

            {(selectedSkills.length > 0 || minRate || maxRate) && (
              <button
                className="btn btn-sm btn-outline"
                onClick={() => { setSelectedSkills([]); setMinRate(""); setMaxRate(""); }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Results ─────────────────────────────── */}
      <div className="wrap" style={{ paddingBottom: "4rem" }}>
        <div className="mp-results-header">
          <span style={{ color: "var(--ink-soft)", fontSize: "0.875rem", fontWeight: 600 }}>
            {loading && freelancers.length === 0 ? "Loading…" : `${total} freelancer${total !== 1 ? "s" : ""} found`}
          </span>
        </div>

        {!loading && freelancers.length === 0 ? (
          <div className="mp-empty">
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔍</div>
            <h3 style={{ fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>No freelancers found</h3>
            <p style={{ color: "var(--ink-soft)", fontWeight: 600 }}>
              Try adjusting your search or removing some filters.
            </p>
          </div>
        ) : (
          <div className="fc-grid">
            {freelancers.map((f) => (
              <FreelancerCard key={f.walletAddress} freelancer={f} />
            ))}
            {loading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card fc-card fc-card--skeleton" aria-hidden />
            ))}
          </div>
        )}

        {hasMore && !loading && (
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <button className="btn btn-outline" onClick={loadMore}>
              Load more ({total - offset - LIMIT > 0 ? total - offset - LIMIT : ""} remaining)
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
