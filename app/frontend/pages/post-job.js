import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Briefcase, Plus, X } from "lucide-react";
import Layout from "@/components/Layout";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuthContext } from "@/pages/_app";
import SolUsdInput from "@/components/SolUsdInput";

const SKILL_SUGGESTIONS = [
  "react", "solana", "rust", "node.js", "python", "next.js",
  "typescript", "design", "ui/ux", "writing", "marketing",
  "video", "figma", "smart contracts", "defi",
];

export default function PostJobPage() {
  const router = useRouter();
  const auth   = useAuthContext();
  const user   = auth?.user ?? null;
  const { publicKey, signMessage, connected } = useWallet();

  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [budget,      setBudget]      = useState("");
  const [skills,      setSkills]      = useState([]);
  const [skillInput,  setSkillInput]  = useState("");
  const [expiresAt,   setExpiresAt]   = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");

  useEffect(() => {
    if (auth?.loading || auth?.signingIn || user) return;
    if (connected && publicKey && signMessage) {
      auth.signIn(publicKey.toBase58(), signMessage);
      return;
    }
    router.replace("/");
  }, [auth?.loading, auth?.signingIn, user, connected, publicKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function addSkill(skill) {
    const s = skill.trim().toLowerCase();
    if (!s || skills.includes(s) || skills.length >= 20) return;
    setSkills((prev) => [...prev, s]);
    setSkillInput("");
  }

  function removeSkill(skill) {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }

  function onSkillKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillInput);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/jobs", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          title,
          description,
          budgetSOL:      parseFloat(budget),
          requiredSkills: skills,
          ...(expiresAt ? { expiresAt } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create job");
        return;
      }

      router.push(`/jobs`);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (auth?.loading || auth?.signingIn || !user) {
    return (
      <Layout title="Post a Job">
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

  return (
    <Layout title="Post a Job">
      <div className="page" style={{ maxWidth: 640 }}>
        <div style={{ marginBottom: "1.75rem" }}>
          <div className="eyebrow">Client Dashboard</div>
          <h1 style={{ fontFamily: "var(--font-display)" }}>Post a Job</h1>
          <p style={{ color: "var(--ink-soft)", fontWeight: 600, marginTop: "0.5rem" }}>
            Describe the project, set a budget in SOL, and list the skills you need.
            Freelancers will reach out through their profiles.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: "1.75rem" }}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Job title <span style={{ color: "var(--red)" }}>*</span></label>
            <input
              className="form-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Build a Solana dApp frontend"
              minLength={5}
              maxLength={100}
              required
            />
            <div className="form-hint">{title.length}/100</div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description <span style={{ color: "var(--red)" }}>*</span></label>
            <textarea
              className="form-input"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the project in detail — scope, deliverables, timeline, and anything a freelancer needs to know."
              minLength={20}
              maxLength={2000}
              required
              style={{ resize: "vertical" }}
            />
            <div className="form-hint">{description.length}/2000</div>
          </div>

          {/* Budget */}
          <div className="form-group">
            <label className="form-label">Budget <span style={{ color: "var(--red)" }}>*</span></label>
            <SolUsdInput
              value={budget}
              onChange={setBudget}
              required
            />
            <div className="form-hint" style={{ marginTop: "0.4rem" }}>This will be the escrow amount when you hire someone.</div>
          </div>

          {/* Skills */}
          <div className="form-group">
            <label className="form-label">Required skills <span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>(max 20)</span></label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
              {skills.map((s) => (
                <span key={s} className="skill-pill skill-pill--selected">
                  {s}
                  <button type="button" className="skill-remove" onClick={() => removeSkill(s)} aria-label={`Remove ${s}`}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <input
              className="form-input"
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={onSkillKeyDown}
              placeholder="Type a skill and press Enter or comma"
              disabled={skills.length >= 20}
              style={{ maxWidth: 360 }}
            />
            <div className="form-hint">Suggestions: </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.3rem" }}>
              {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s)).slice(0, 10).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="skill-pill skill-pill--toggle"
                  onClick={() => addSkill(s)}
                >
                  <Plus size={10} style={{ verticalAlign: "middle" }} /> {s}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry date (optional) */}
          <div className="form-group">
            <label className="form-label">Expiry date <span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>(optional)</span></label>
            <input
              className="form-input"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              style={{ maxWidth: 220 }}
            />
            <div className="form-hint">Leave blank to keep the job open indefinitely.</div>
          </div>

          {error && (
            <div style={{ background: "var(--pink-lo)", border: "2px solid var(--red)", borderRadius: "var(--r-sm)", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--red)", fontWeight: 700, fontSize: "0.9rem" }}>
              {error}
            </div>
          )}

          <div className="btn-row">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              <Briefcase size={15} />
              {submitting ? "Posting…" : "Post Job"}
            </button>
            <Link href="/jobs" className="btn btn-outline">Cancel</Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
