import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { X, Plus, Save, CheckCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuthContext } from "@/pages/_app";
import useSolPrice from "@/hooks/useSolPrice";

const SKILL_SUGGESTIONS = [
  "react", "solana", "rust", "node.js", "python", "next.js",
  "typescript", "design", "ui/ux", "writing", "marketing",
  "video", "figma", "smart contracts", "defi",
];

export default function SettingsPage() {
  const router    = useRouter();
  const auth      = useAuthContext();
  const user      = auth?.user ?? null;
  const solPrice  = useSolPrice();

  const [displayName,  setDisplayName]  = useState("");
  const [bio,          setBio]          = useState("");
  const [skills,       setSkills]       = useState([]);
  const [skillInput,   setSkillInput]   = useState("");
  const [hourlyRate,   setHourlyRate]   = useState("");
  const [avatarUrl,    setAvatarUrl]    = useState("");
  const [isClient,     setIsClient]     = useState(false);
  const [isFreelancer, setIsFreelancer] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");

  useEffect(() => {
    if (!auth?.loading && !auth?.signingIn && !user) router.replace("/");
  }, [auth?.loading, auth?.signingIn, user, router]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || "");
    setBio(user.bio || "");
    setSkills(user.skills || []);
    setHourlyRate(user.hourlyRate != null ? String(user.hourlyRate) : "");
    setAvatarUrl(user.avatarUrl || "");
    setIsClient(!!user.isClient);
    setIsFreelancer(!!user.isFreelancer);
  }, [user]);

  function addSkill(s) {
    const val = s.trim().toLowerCase();
    if (!val || skills.includes(val) || skills.length >= 20) return;
    setSkills((prev) => [...prev, val]);
    setSkillInput("");
  }

  function removeSkill(s) {
    setSkills((prev) => prev.filter((x) => x !== s));
  }

  function onSkillKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillInput);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/auth/me", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName:  displayName.trim() || null,
          bio:          bio.trim() || null,
          skills,
          hourlyRate:   hourlyRate ? parseFloat(hourlyRate) : null,
          avatarUrl:    avatarUrl.trim() || null,
          isClient,
          isFreelancer,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      if (auth?.refreshUser) auth.refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (auth?.loading || auth?.signingIn || !user) {
    return (
      <Layout title="Settings">
        <div className="page" style={{ textAlign: "center", paddingTop: "4rem" }}>
          <div className="spinner" />
          {auth?.signingIn && (
            <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", fontWeight: 600, marginTop: "1rem" }}>
              Approve the sign-in request in Phantom to continue…
            </p>
          )}
        </div>
      </Layout>
    );
  }

  const initial = (user.displayName || user.walletAddress || "?")[0].toUpperCase();
  const hue     = ((user.walletAddress || "A").charCodeAt(0) * 37) % 360;

  return (
    <Layout title="Settings">
      <div className="page" style={{ maxWidth: 640 }}>
        <div style={{ marginBottom: "1.75rem" }}>
          <div className="eyebrow">Account</div>
          <h1 style={{ fontFamily: "var(--font-display)" }}>Settings</h1>
          <p style={{ color: "var(--ink-soft)", fontWeight: 600, marginTop: "0.5rem" }}>
            Manage your profile, skills, and account preferences.
          </p>
        </div>

        <form onSubmit={handleSave}>

          {/* ── Avatar / wallet strip ── */}
          <div className="card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="Avatar preview" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--line)", flexShrink: 0 }} onError={(e) => { e.target.style.display = "none"; }} />
              : <div style={{ width: 56, height: 56, borderRadius: "50%", background: `hsl(${hue},55%,78%)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.3rem", color: "var(--ink)", fontFamily: "var(--font-display)", flexShrink: 0, border: "3px solid var(--line)" }}>{initial}</div>
            }
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{user.displayName || "No display name set"}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", fontWeight: 600, wordBreak: "break-all" }}>{user.walletAddress}</div>
            </div>
          </div>

          {/* ── Profile fields ── */}
          <div className="card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}>Profile</h2>

            <div className="form-group">
              <label className="form-label">Display name</label>
              <input
                className="form-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name or pseudonym"
                maxLength={50}
              />
              <div className="form-hint">{displayName.length}/50 — shown instead of your wallet address</div>
            </div>

            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea
                className="form-input"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell clients and freelancers about yourself…"
                maxLength={500}
                style={{ resize: "vertical" }}
              />
              <div className="form-hint">{bio.length}/500</div>
            </div>

            <div className="form-group">
              <label className="form-label">Avatar URL <span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>(optional)</span></label>
              <input
                className="form-input"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
              />
              <div className="form-hint">Direct link to a public image</div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Hourly rate <span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>(optional)</span></label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  className="form-input"
                  type="number"
                  step="0.001"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="0.1"
                  style={{ maxWidth: 140 }}
                />
                <span style={{ fontWeight: 700, color: "var(--ink-soft)", fontSize: "0.88rem" }}>SOL/hr</span>
                {solPrice && hourlyRate && !isNaN(parseFloat(hourlyRate)) && parseFloat(hourlyRate) > 0 && (
                  <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>
                    ≈ ${(parseFloat(hourlyRate) * solPrice).toFixed(0)}/hr USD
                  </span>
                )}
              </div>
              <div className="form-hint">Leave blank to show "Negotiable" on your profile</div>
            </div>
          </div>

          {/* ── Skills ── */}
          <div className="card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}>
              Skills <span style={{ color: "var(--ink-soft)", fontWeight: 600, fontSize: "0.8rem" }}>({skills.length}/20)</span>
            </h2>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem", minHeight: 32 }}>
              {skills.map((s) => (
                <span key={s} className="skill-pill skill-pill--selected">
                  {s}
                  <button type="button" className="skill-remove" onClick={() => removeSkill(s)} aria-label={`Remove ${s}`}>
                    <X size={11} />
                  </button>
                </span>
              ))}
              {skills.length === 0 && (
                <span style={{ color: "var(--ink-soft)", fontSize: "0.85rem", fontWeight: 600, alignSelf: "center" }}>No skills added yet</span>
              )}
            </div>

            <input
              className="form-input"
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={onSkillKeyDown}
              placeholder="Type a skill and press Enter or comma"
              disabled={skills.length >= 20}
              style={{ maxWidth: 340, marginBottom: "0.5rem" }}
            />
            <div className="form-hint">Suggestions:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.3rem" }}>
              {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s)).slice(0, 10).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="skill-pill skill-pill--toggle"
                  onClick={() => addSkill(s)}
                  disabled={skills.length >= 20}
                >
                  <Plus size={10} style={{ verticalAlign: "middle" }} /> {s}
                </button>
              ))}
            </div>
          </div>

          {/* ── Role ── */}
          <div className="card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>I am a…</h2>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem", fontWeight: 600, marginBottom: "1rem", marginTop: 0 }}>
              Choose one or both. Your role unlocks the Client and Freelancer dashboards.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setIsClient((v) => !v)}
                style={{
                  padding: "10px 20px", borderRadius: "var(--r-sm)", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem",
                  border: `2.5px solid ${isClient ? "var(--purple)" : "var(--line)"}`,
                  background: isClient ? "var(--lav-lo)" : "var(--paper)",
                  color: isClient ? "var(--purple)" : "var(--ink-soft)",
                  display: "flex", alignItems: "center", gap: "0.4rem",
                }}
              >
                {isClient && <CheckCircle size={15} strokeWidth={2.5} />}
                Client
              </button>
              <button
                type="button"
                onClick={() => setIsFreelancer((v) => !v)}
                style={{
                  padding: "10px 20px", borderRadius: "var(--r-sm)", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem",
                  border: `2.5px solid ${isFreelancer ? "var(--leaf)" : "var(--line)"}`,
                  background: isFreelancer ? "var(--sage-lo)" : "var(--paper)",
                  color: isFreelancer ? "var(--leaf)" : "var(--ink-soft)",
                  display: "flex", alignItems: "center", gap: "0.4rem",
                }}
              >
                {isFreelancer && <CheckCircle size={15} strokeWidth={2.5} />}
                Freelancer
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: "var(--pink-lo)", border: "2px solid var(--red)", borderRadius: "var(--r-sm)", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--red)", fontWeight: 700, fontSize: "0.9rem" }}>
              {error}
            </div>
          )}

          {saved && (
            <div style={{ background: "var(--sage-lo)", border: "2px solid var(--leaf)", borderRadius: "var(--r-sm)", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--ink)", fontWeight: 700, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CheckCircle size={16} style={{ color: "var(--leaf)" }} /> Profile saved successfully.
            </div>
          )}

          <div className="btn-row">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              <Save size={15} />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
