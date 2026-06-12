import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);
import Layout from "@/components/Layout";

const STATS = [
  { value: "4M+",  label: "Pakistani freelancers" },
  { value: "0%",   label: "Platform fees" },
  { value: "<2s",  label: "Payment speed" },
  { value: "$1.5B", label: "Annual earnings at risk" },
];

const STEPS = [
  {
    n: "01",
    icon: "🔒",
    title: "Lock SOL",
    desc: "Client creates an escrow and locks SOL in a Solana smart contract. Funds are safe — only released on approval.",
    color: "var(--lav)",
  },
  {
    n: "02",
    icon: "✍️",
    title: "Deliver Work",
    desc: "Freelancer completes the job and submits proof of delivery on-chain. The record is permanent.",
    color: "var(--sage)",
  },
  {
    n: "03",
    icon: "⚡",
    title: "Get Paid",
    desc: "Client approves. SOL transfers instantly to the freelancer's wallet. No bank. No delay. No middleman.",
    color: "var(--sky)",
  },
];

export default function Home() {
  const { publicKey, connected } = useWallet();

  return (
    <Layout title="Home">
      {/* ── Hero ─────────────────────────────────── */}
      <section style={{ padding: "5rem 1.5rem 3.5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* soft background glow */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(214,200,236,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* floating sprinkles */}
        <span className="sprinkle" style={{ left: "12%", top: "18%", animationDelay: "0s",   animationDuration: "8s"  }}>✿</span>
        <span className="sprinkle" style={{ left: "88%", top: "22%", animationDelay: "1.2s", animationDuration: "10s" }}>⟡</span>
        <span className="sprinkle" style={{ left: "5%",  top: "60%", animationDelay: "2s",   animationDuration: "7s"  }}>♡</span>
        <span className="sprinkle" style={{ left: "94%", top: "65%", animationDelay: "0.5s", animationDuration: "9s"  }}>·</span>

        {/* "live" badge */}
        <div
          data-enter
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 999, border: "2.5px solid var(--leaf)", background: "var(--sage-lo)", marginBottom: "1.25rem" }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--leaf)", display: "inline-block" }} />
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
          {STATS.map(({ value, label }, i) => (
            <div
              key={label}
              style={{ background: "var(--paper)", padding: "1.5rem", textAlign: "center" }}
            >
              <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--brown)", fontFamily: "var(--font-display)" }}>{value}</div>
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
        <p data-reveal style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: "0.95rem", marginBottom: "2.5rem", fontWeight: 600 }}>
          Three steps. Fully on-chain. No trust required.
        </p>

        <div data-stagger style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {STEPS.map(({ n, icon, title, desc, color }, i) => (
            <div
              key={n}
              className="card"
              data-tilt
              style={{ "--i": i, position: "relative", overflow: "hidden" }}
            >
              {/* colored top stripe */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: color, borderRadius: "var(--r-md) var(--r-md) 0 0" }} />
              <div style={{ fontSize: "0.7rem", fontWeight: 800, color, letterSpacing: "0.1em", marginBottom: "0.75rem", fontFamily: "var(--font-body)", paddingTop: 8 }}>{n}</div>
              <div style={{ fontSize: "1.75rem", marginBottom: "0.6rem" }}>{icon}</div>
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
          <span className="sprinkle" style={{ left: "5%", top: "30%", animationDelay: "1s" }}>✿</span>
          <span className="sprinkle" style={{ right: "5%", bottom: "20%", animationDelay: "2s" }}>♡</span>
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
