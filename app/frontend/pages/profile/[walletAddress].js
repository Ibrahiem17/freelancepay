import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MapPin, Briefcase, Star as StarIcon } from "lucide-react";
import Layout from "@/components/Layout";
import StarRating from "@/components/StarRating";

const REVIEW_LIMIT = 5;

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function truncWallet(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function AvatarBlock({ name, avatarUrl, size = 80 }) {
  const letter = (name || "?")[0].toUpperCase();
  const hue    = ((name || "A").charCodeAt(0) * 37) % 360;
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || "Avatar"}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--line)" }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: `hsl(${hue},55%,78%)`,
        border: "3px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.4, fontWeight: 800, color: "var(--ink)",
        fontFamily: "var(--font-display)", flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}

function ClientAvatar({ name, avatarUrl, size = 36 }) {
  const letter = (name || "?")[0].toUpperCase();
  const hue    = ((name || "A").charCodeAt(0) * 37) % 360;
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || "Avatar"}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--line)", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: `hsl(${hue},55%,78%)`,
        border: "2px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.4, fontWeight: 800, color: "var(--ink)",
        fontFamily: "var(--font-display)", flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}

export default function ProfilePage() {
  const router          = useRouter();
  const { walletAddress } = router.query;

  const [user,          setUser]          = useState(null);
  const [userLoading,   setUserLoading]   = useState(true);
  const [userError,     setUserError]     = useState(null);

  const [reviews,       setReviews]       = useState([]);
  const [aggregate,     setAggregate]     = useState(null);
  const [revOffset,     setRevOffset]     = useState(0);
  const [hasMore,       setHasMore]       = useState(false);
  const [revLoading,    setRevLoading]    = useState(true);

  // Fetch user profile
  useEffect(() => {
    if (!walletAddress) return;
    setUserLoading(true);
    setUserError(null);
    fetch(`/api/users/${walletAddress}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
        else setUserError(data.error || "User not found");
      })
      .catch(() => setUserError("Failed to load profile"))
      .finally(() => setUserLoading(false));
  }, [walletAddress]);

  // Fetch reviews (initial load)
  useEffect(() => {
    if (!walletAddress) return;
    loadReviews(0, false);
  }, [walletAddress]);

  async function loadReviews(offset, append) {
    setRevLoading(true);
    try {
      const r = await fetch(`/api/reviews/${walletAddress}?limit=${REVIEW_LIMIT}&offset=${offset}`);
      const data = await r.json();
      if (append) {
        setReviews((prev) => [...prev, ...(data.reviews || [])]);
      } else {
        setReviews(data.reviews || []);
        setAggregate({
          averageRating: data.averageRating,
          totalReviews:  data.totalReviews,
          distribution:  data.distribution,
        });
      }
      setHasMore(data.hasMore || false);
      setRevOffset(offset + REVIEW_LIMIT);
    } catch {
      // silently fail — reviews section stays empty
    }
    setRevLoading(false);
  }

  function handleLoadMore() {
    loadReviews(revOffset, true);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (userLoading) {
    return (
      <Layout title="Profile">
        <div className="page" style={{ textAlign: "center", paddingTop: "4rem" }}>
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  if (userError) {
    return (
      <Layout title="Profile">
        <div className="page">
          <Link href="/marketplace" style={{ fontSize: "0.85rem", color: "var(--ink-soft)", fontWeight: 700 }}>
            ← Back to Marketplace
          </Link>
          <div className="empty-state" style={{ marginTop: "2rem" }}>
            <p>{userError}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long" })
    : null;

  return (
    <Layout title={user?.displayName ? `${user.displayName} — FreelancePay` : "Profile"}>
      <div className="page" style={{ maxWidth: 760 }}>
        {/* ── Back ── */}
        <Link href="/marketplace" style={{ fontSize: "0.85rem", color: "var(--ink-soft)", fontWeight: 700, display: "inline-block", marginBottom: "1.25rem" }}>
          ← Marketplace
        </Link>

        {/* ── Profile header card ── */}
        <div className="card profile-header" style={{ marginBottom: "1.5rem" }}>
          <div className="profile-top">
            <AvatarBlock name={user.displayName} avatarUrl={user.avatarUrl} size={80} />
            <div className="profile-identity">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>
                  {user.displayName || "Anonymous"}
                </h1>
                {user.isFreelancer && <span className="badge badge-active" style={{ fontSize: "0.72rem" }}>Freelancer</span>}
                {user.isClient    && <span className="badge badge-submitted" style={{ fontSize: "0.72rem" }}>Client</span>}
              </div>
              <div className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: 4, fontWeight: 600 }}>
                {truncWallet(user.walletAddress)}
              </div>
              {user.averageRating != null && user.totalReviews > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: 6 }}>
                  <StarRating value={user.averageRating} size="sm" />
                  <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--ink)" }}>
                    {user.averageRating.toFixed(1)}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>
                    ({user.totalReviews} review{user.totalReviews !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
            </div>
            {user.isFreelancer && (
              <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                <Link href={`/client?hire=${user.walletAddress}`} className="btn btn-primary">
                  Hire Me
                </Link>
              </div>
            )}
          </div>

          {user.bio && (
            <p style={{ fontSize: "0.9rem", color: "var(--ink-soft)", lineHeight: 1.65, fontWeight: 600, marginTop: "1rem", paddingTop: "1rem", borderTop: "2px dashed var(--line)" }}>
              {user.bio}
            </p>
          )}

          {/* Stats row */}
          <div className="profile-stats-row">
            {user.hourlyRate != null && (
              <div className="profile-stat">
                <div className="profile-stat-value">${user.hourlyRate}/hr</div>
                <div className="profile-stat-label">Hourly Rate</div>
              </div>
            )}
            {user.isFreelancer && (
              <div className="profile-stat">
                <div className="profile-stat-value">{user.completedJobs ?? 0}</div>
                <div className="profile-stat-label">Jobs Done</div>
              </div>
            )}
            {memberSince && (
              <div className="profile-stat">
                <div className="profile-stat-value" style={{ fontSize: "0.9rem" }}>{memberSince}</div>
                <div className="profile-stat-label">Member Since</div>
              </div>
            )}
          </div>

          {/* Skills */}
          {user.skills && user.skills.length > 0 && (
            <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {user.skills.map((s) => (
                <span key={s} className="skill-pill">{s}</span>
              ))}
            </div>
          )}
        </div>

        {/* ── Reviews section (freelancers only) ── */}
        {user.isFreelancer && (
          <div>
            <div className="section-header" style={{ marginBottom: "1rem" }}>
              <h2 className="section-title">Reviews</h2>
            </div>

            {/* Aggregate summary */}
            {aggregate && aggregate.totalReviews > 0 && (
              <div className="card reviews-agg" style={{ marginBottom: "1.25rem" }}>
                <div className="reviews-agg-left">
                  <div className="reviews-agg-score">
                    {aggregate.averageRating != null ? aggregate.averageRating.toFixed(1) : "—"}
                  </div>
                  <StarRating value={aggregate.averageRating || 0} size="md" />
                  <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)", fontWeight: 600, marginTop: 4 }}>
                    Based on {aggregate.totalReviews} review{aggregate.totalReviews !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="reviews-agg-dist">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = aggregate.distribution?.[star] || 0;
                    const pct   = aggregate.totalReviews > 0 ? (count / aggregate.totalReviews) * 100 : 0;
                    return (
                      <div key={star} className="reviews-dist-row">
                        <span className="reviews-dist-label">{star}★</span>
                        <div className="reviews-dist-track">
                          <div className="reviews-dist-bar" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="reviews-dist-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No reviews yet */}
            {!revLoading && reviews.length === 0 && (
              <div className="empty-state">
                <StarIcon size={28} style={{ color: "var(--line)", display: "block", margin: "0 auto 0.5rem" }} />
                <p>No reviews yet.</p>
              </div>
            )}

            {/* Review cards */}
            {reviews.map((r) => (
              <div key={r.id} className="card review-card" style={{ marginBottom: "0.85rem" }}>
                <div className="review-card-header">
                  <div className="review-client-info">
                    <ClientAvatar name={r.client?.displayName || r.clientWallet} avatarUrl={r.client?.avatarUrl} />
                    <div>
                      <div className="review-client-name">
                        {r.client?.displayName || truncWallet(r.clientWallet)}
                      </div>
                      <div className="review-time">{relativeTime(r.createdAt)}</div>
                    </div>
                  </div>
                  <StarRating value={r.rating} size="sm" />
                </div>
                <p className="review-comment">{r.comment}</p>
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
                <button
                  className="btn btn-outline"
                  onClick={handleLoadMore}
                  disabled={revLoading}
                >
                  {revLoading ? <><span className="spinner" /> Loading…</> : "Load more reviews"}
                </button>
              </div>
            )}

            {revLoading && reviews.length === 0 && (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <div className="spinner" />
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
