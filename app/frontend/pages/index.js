import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);
import Layout from "@/components/Layout";

const STATS = [
  { value: "4M+", label: "Pakistani freelancers" },
  { value: "0%", label: "Platform fees" },
  { value: "<2s", label: "Payment speed" },
  { value: "$1.5B", label: "Annual earnings at risk" },
];

const STEPS = [
  {
    n: "01",
    icon: "🔒",
    title: "Lock SOL",
    desc: "Client creates an escrow and locks SOL in a Solana smart contract. Funds are safe — only released on approval.",
    color: "#9945FF",
  },
  {
    n: "02",
    icon: "✍️",
    title: "Deliver Work",
    desc: "Freelancer completes the job and submits proof of delivery on-chain. The record is permanent.",
    color: "#14F195",
  },
  {
    n: "03",
    icon: "⚡",
    title: "Get Paid",
    desc: "Client approves. SOL transfers instantly to the freelancer's wallet. No bank. No delay. No middleman.",
    color: "#3b82f6",
  },
];

export default function Home() {
  const { publicKey, connected } = useWallet();

  return (
    <Layout title="Home">
      {/* ── Hero ── */}
      <section style={{ padding: "5rem 1.5rem 3.5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(153,69,255,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, border: "1px solid rgba(20,241,149,0.3)", background: "rgba(20,241,149,0.08)", marginBottom: "1.25rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#14F195", display: "inline-block" }} />
          <span style={{ fontSize: "0.75rem", color: "#14F195", fontWeight: 600, letterSpacing: "0.05em" }}>LIVE ON SOLANA DEVNET</span>
        </div>

        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
          Get Paid Instantly.{" "}
          <span style={{ background: "linear-gradient(90deg, #9945FF, #14F195)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            No Middleman.
          </span>
        </h1>

        <p style={{ fontSize: "1.1rem", color: "#94a3b8", maxWidth: 520, margin: "0 auto 2rem", lineHeight: 1.6 }}>
          FreelancePay locks SOL in a Solana smart contract until work is approved — protecting both clients and freelancers with zero platform fees.
        </p>

        {connected ? (
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/client" className="btn btn-primary" style={{ padding: "12px 32px", fontSize: "1rem", borderRadius: 10 }}>
              I&apos;m a Client →
            </Link>
            <Link href="/freelancer" className="btn btn-outline" style={{ padding: "12px 32px", fontSize: "1rem", borderRadius: 10 }}>
              I&apos;m a Freelancer →
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <WalletMultiButton style={{ fontSize: "1rem", height: 48, padding: "0 28px", borderRadius: 10 }} />
            <p className="muted" style={{ fontSize: "0.85rem" }}>Connect Phantom to get started</p>
          </div>
        )}
      </section>

      {/* ── Stats ── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 1.5rem 3.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "var(--border)", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
          {STATS.map(({ value, label }) => (
            <div key={label} style={{ background: "var(--bg-card)", padding: "1.5rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "#14F195", fontFamily: "'Courier New', monospace" }}>{value}</div>
              <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 1.5rem 5rem" }}>
        <h2 style={{ textAlign: "center", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>How it works</h2>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: "0.9rem", marginBottom: "2.5rem" }}>Three steps. Fully on-chain. No trust required.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {STEPS.map(({ n, icon, title, desc, color }) => (
            <div key={n} className="card" style={{ position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color }} />
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color, letterSpacing: "0.1em", marginBottom: "0.75rem" }}>{n}</div>
              <div style={{ fontSize: "1.75rem", marginBottom: "0.6rem" }}>{icon}</div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>{title}</h3>
              <p style={{ fontSize: "0.87rem", color: "#64748b", lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section style={{ maxWidth: 900, margin: "0 auto 4rem", padding: "0 1.5rem" }}>
        <div className="card" style={{ textAlign: "center", padding: "2.5rem", background: "linear-gradient(135deg, rgba(153,69,255,0.08) 0%, rgba(20,241,149,0.04) 100%)", border: "1px solid rgba(153,69,255,0.2)" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>Ready to start?</h2>
          <p style={{ color: "#94a3b8", marginBottom: "1.5rem", fontSize: "0.9rem" }}>Connect your Phantom wallet and create your first escrow in 60 seconds.</p>
          {connected ? (
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/client" className="btn btn-primary">Create Escrow</Link>
              <Link href="/freelancer" className="btn btn-outline">View Contracts</Link>
            </div>
          ) : (
            <WalletMultiButton />
          )}
        </div>
      </section>
    </Layout>
  );
}
