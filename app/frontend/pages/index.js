import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { Lock, PenLine, Zap } from "lucide-react";
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);
import Layout from "@/components/Layout";

const STATS = [
  { value: "4M+",   label: "Pakistani freelancers" },
  { value: "0%",    label: "Platform fees" },
  { value: "<2s",   label: "Payment speed" },
  { value: "$1.5B", label: "Annual earnings at risk" },
];

const STEPS = [
  {
    n: "01", Icon: Lock, title: "Lock SOL",
    desc: "Client creates an escrow and locks SOL in a Solana smart contract. Funds are safe — only released on approval.",
    color: "var(--lav)", bgLo: "var(--lav-lo)",
  },
  {
    n: "02", Icon: PenLine, title: "Deliver Work",
    desc: "Freelancer completes the job and submits proof of delivery on-chain. The record is permanent.",
    color: "var(--sage)", bgLo: "var(--sage-lo)",
  },
  {
    n: "03", Icon: Zap, title: "Get Paid",
    desc: "Client approves. SOL transfers instantly to the freelancer's wallet. No bank. No delay. No middleman.",
    color: "var(--sky)", bgLo: "var(--sky-lo)",
  },
];

/* ── Vault illustration ──────────────────────────── */
function VaultSVG() {
  return (
    <svg
      width="190" height="158" viewBox="0 0 190 158"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      className="vault-hero-svg"
      style={{ filter: "url(#rough)" }}
      aria-hidden
    >
      {/* vault body */}
      <rect x="6" y="6" width="158" height="108" rx="16"
        fill="var(--lav)" stroke="var(--ink)" strokeWidth="3.5"/>
      {/* handle */}
      <rect x="157" y="36" width="22" height="48" rx="8"
        fill="var(--butter)" stroke="var(--ink)" strokeWidth="3"/>
      {/* door panel */}
      <rect x="20" y="18" width="130" height="84" rx="10"
        fill="var(--lav-lo)" stroke="var(--ink)" strokeWidth="2.4"/>
      {/* dial outer */}
      <circle cx="85" cy="60" r="27"
        fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.4"/>
      {/* dial ticks */}
      <line x1="85" y1="33" x2="85" y2="40" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="85" y1="80" x2="85" y2="87" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="58" y1="60" x2="65" y2="60" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="105" y1="60" x2="112" y2="60" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round"/>
      {/* dial pointer */}
      <line x1="85" y1="60" x2="100" y2="45"
        stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round"/>
      {/* dial centre */}
      <circle cx="85" cy="60" r="6"
        fill="var(--butter)" stroke="var(--ink)" strokeWidth="2"/>
      {/* coin stack — butter (client locked SOL) */}
      <ellipse cx="44" cy="145" rx="17" ry="6.5" fill="var(--butter)" stroke="var(--ink)" strokeWidth="2"/>
      <ellipse cx="44" cy="138" rx="17" ry="6.5" fill="var(--butter)" stroke="var(--ink)" strokeWidth="2"/>
      <ellipse cx="44" cy="131" rx="17" ry="6.5" fill="var(--butter)" stroke="var(--ink)" strokeWidth="2"/>
      {/* coin stack — sage (earned / paid out) */}
      <ellipse cx="110" cy="142" rx="13" ry="5.5" fill="var(--sage)" stroke="var(--ink)" strokeWidth="2"/>
      <ellipse cx="110" cy="136" rx="13" ry="5.5" fill="var(--sage)" stroke="var(--ink)" strokeWidth="2"/>
    </svg>
  );
}

/* ── Client ↔ Freelancer trust motif ────────────── */
function TrustMotif() {
  return (
    <div
      aria-hidden
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "2rem" }}
    >
      <div className="avatar" style={{ background: "var(--lav)", fontSize: "0.8rem" }}>C</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <Lock size={14} strokeWidth={2.2} style={{ color: "var(--ink-soft)" }} aria-hidden />
        <div style={{ height: 2, width: 48, background: "var(--line)", borderRadius: 2 }} />
      </div>
      <div className="avatar" style={{ background: "var(--sage)", fontSize: "0.8rem" }}>F</div>
    </div>
  );
}

export default function Home() {
  const { publicKey, connected } = useWallet();

  return (
    <Layout title="Home">
      {/* ── Hero ─────────────────────────────────── */}
      <section style={{ padding: "4rem 1.5rem 3.5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* soft radial glow */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(214,200,236,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
        {/* hex chain texture */}
        <div className="hex-texture" />

        {/* vault illustration */}
        <div data-enter style={{ marginBottom: "1.5rem", position: "relative" }}>
          <VaultSVG />
        </div>

        {/* "live" badge */}
        <div
          data-enter
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 999, border: "2.5px solid var(--leaf)", background: "var(--sage-lo)", marginBottom: "1.25rem" }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--leaf)", display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: "0.75rem", color: "var(--leaf)", fontWeight: 800, letterSpacing: "0.06em", fontFamily: "var(--font-body)" }}>
            LIVE ON SOLANA DEVNET
          </span>
        </div>

        <h1
          data-enter
          style={{ fontSize: "var(--fs-hero)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: "1.25rem", fontFamily: "var(--font-display)" }}
        >
          Get Paid Instantly.{" "}
          <span style={{ background: "linear-gradient(90deg, var(--lav) 0%, var(--sage) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            No Middleman.
          </span>
        </h1>

        <p
          data-enter
          style={{ fontSize: "var(--fs-lg)", color: "var(--ink-soft)", maxWidth: 520, margin: "0 auto 2rem", lineHeight: 1.65, fontWeight: 600 }}
        >
          FreelancePay locks SOL in a Solana smart contract until work is approved —
          protecting both clients and freelancers with zero platform fees.
        </p>

        {connected ? (
          <div data-enter style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/client" className="btn btn-primary magnetic" style={{ padding: "12px 32px", fontSize: "1rem" }}>
              I&apos;m a Client →
            </Link>
            <Link href="/freelancer" className="btn btn-outline magnetic" style={{ padding: "12px 32px", fontSize: "1rem" }}>
              I&apos;m a Freelancer →
            </Link>
          </div>
        ) : (
          <div data-enter style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <WalletMultiButton style={{ fontSize: "1rem", height: 48, padding: "0 28px" }} />
            <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", fontWeight: 600, margin: 0 }}>Connect Phantom to get started</p>
          </div>
        )}
      </section>

      {/* ── Stats ────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 1.5rem 3.5rem" }}>
        <div
          data-reveal="zoom"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "var(--line)", borderRadius: "var(--r-md)", overflow: "hidden", border: "2.5px solid var(--line)" }}
        >
          {STATS.map(({ value, label }) => (
            <div key={label} style={{ background: "var(--paper)", padding: "1.5rem", textAlign: "center" }}>
              <div className="amount" style={{ fontSize: "1.9rem", color: "var(--brown)" }}>{value}</div>
              <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: 4, fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 1.5rem 5rem" }}>
        <h2 data-reveal style={{ textAlign: "center", fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>
          How it works
        </h2>
        <p data-reveal style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: "0.95rem", marginBottom: "1.5rem", fontWeight: 600 }}>
          Three steps. Fully on-chain. No trust required.
        </p>

        {/* client ↔ freelancer trust motif */}
        <div data-reveal>
          <TrustMotif />
        </div>

        <div data-stagger style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {STEPS.map(({ n, Icon, title, desc, color, bgLo }, i) => (
            <div key={n} className="card" data-tilt style={{ "--i": i, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: color, borderRadius: "var(--r-md) var(--r-md) 0 0" }} />
              <div style={{ fontSize: "0.7rem", fontWeight: 800, color, letterSpacing: "0.1em", marginBottom: "0.75rem", fontFamily: "var(--font-body)", paddingTop: 8 }}>{n}</div>
              <div style={{ marginBottom: "0.75rem" }}>
                <div className="icon-badge" style={{ background: bgLo, border: `2.5px solid ${color}` }}>
                  <Icon size={20} strokeWidth={2.2} style={{ color }} aria-hidden />
                </div>
              </div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>{title}</h3>
              <p style={{ fontSize: "0.87rem", color: "var(--ink-soft)", lineHeight: 1.6, fontWeight: 600, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto 4rem", padding: "0 1.5rem" }}>
        <div
          data-reveal="pop"
          className="card"
          style={{ textAlign: "center", padding: "2.5rem", background: "var(--lav-lo)", border: "3px dashed var(--lav)" }}
        >
          <h2 style={{ fontSize: "var(--fs-h2)", marginBottom: "0.75rem", fontFamily: "var(--font-display)" }}>
            Ready to start?
          </h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: "1.5rem", fontSize: "0.95rem", fontWeight: 600 }}>
            Connect your Phantom wallet and create your first escrow in 60 seconds.
          </p>
          {connected ? (
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/client"     className="btn btn-primary magnetic">Create Escrow</Link>
              <Link href="/freelancer" className="btn btn-outline magnetic">View Contracts</Link>
            </div>
          ) : (
            <WalletMultiButton />
          )}
        </div>
      </section>
    </Layout>
  );
}
