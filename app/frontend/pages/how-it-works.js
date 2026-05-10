import Link from "next/link";
import Layout from "@/components/Layout";

const STEPS = [
  {
    emoji: "🤝",
    who: "Client",
    color: "#9945FF",
    title: "Client hires a freelancer",
    simple: "Imagine you want someone to build you a website. You find a freelancer and agree on a price — let's say 1 SOL.",
    normal: "The client creates an escrow contract on FreelancePay, enters the freelancer's wallet address and the agreed amount.",
  },
  {
    emoji: "🔒",
    who: "Money gets locked",
    color: "#3b82f6",
    title: "SOL is locked in a safe box",
    simple: "Instead of paying the freelancer right away (what if they disappear?), the money goes into a digital safe box on Solana. Nobody can touch it — not even you.",
    normal: "The SOL is transferred into a Program Derived Account (PDA) — a smart contract vault that only releases funds when both parties complete their role.",
  },
  {
    emoji: "✍️",
    who: "Freelancer",
    color: "#14F195",
    title: "Freelancer does the work",
    simple: "The freelancer builds the website. When done, they press 'Submit Work' and write what they delivered — like a GitHub link or a description. This gets saved on Solana forever.",
    normal: "The freelancer calls the submit_work instruction, recording their delivery note permanently on-chain. The escrow status changes from Active → Submitted.",
  },
  {
    emoji: "✅",
    who: "Client",
    color: "#14F195",
    title: "Client checks and approves",
    simple: "You look at the work. Happy with it? Click 'Approve'. The money instantly flies from the safe box straight into the freelancer's wallet. Done!",
    normal: "The client calls approve_work. The smart contract closes the escrow account and transfers the full SOL balance to the freelancer's wallet in the same transaction.",
  },
  {
    emoji: "↩️",
    who: "Client",
    color: "#f59e0b",
    title: "Or cancel if needed",
    simple: "If the freelancer never starts the work and the status is still Active, the client can cancel and get their money back. No loss.",
    normal: "The client calls cancel_escrow. The contract closes and refunds the full SOL to the client's wallet. This only works before the freelancer submits.",
  },
];

const QUESTIONS = [
  {
    q: "What if the freelancer disappears after I pay?",
    a: "You never actually 'pay' the freelancer upfront. Your SOL goes into the smart contract safe box. If the freelancer never submits work, you can cancel and get it all back.",
  },
  {
    q: "What if the client refuses to approve even after I deliver?",
    a: "This version is a learning/hackathon project. In a full production version, a dispute system or time-based auto-release would handle this. For now, both parties should agree before creating the escrow.",
  },
  {
    q: "Is this real money?",
    a: "Not right now. The app runs on Solana Devnet — a test environment where SOL has no real value. You can get free devnet SOL from faucet.solana.com to test it out.",
  },
  {
    q: "What is a smart contract?",
    a: "Think of it as a vending machine. You put money in, press a button, and the machine automatically gives you the snack — no human needed. A smart contract works the same way: rules are written in code, and it executes automatically when conditions are met.",
  },
  {
    q: "What is Solana?",
    a: "Solana is a blockchain — a public digital ledger that thousands of computers around the world share. Transactions on Solana take less than 2 seconds and cost almost nothing (fractions of a cent).",
  },
];

export default function HowItWorks() {
  return (
    <Layout title="How It Works">
      {/* Hero */}
      <section style={{ textAlign: "center", padding: "4rem 1.5rem 2.5rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(153,69,255,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🧠</div>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, marginBottom: "1rem", lineHeight: 1.2 }}>
          How FreelancePay Works
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#94a3b8", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
          Explained so simply that even a 10-year-old could understand it.
          <br />No jargon. No fluff. Just the idea.
        </p>
      </section>

      {/* The core idea */}
      <section style={{ maxWidth: 740, margin: "0 auto", padding: "0 1.5rem 3rem" }}>
        <div className="card" style={{ textAlign: "center", padding: "2rem", background: "linear-gradient(135deg, rgba(153,69,255,0.06), rgba(20,241,149,0.04))", border: "1px solid rgba(153,69,255,0.2)" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>💡</div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.75rem" }}>The Big Idea in One Sentence</h2>
          <p style={{ fontSize: "1rem", color: "#cbd5e1", lineHeight: 1.8 }}>
            A <strong style={{ color: "#9945FF" }}>client</strong> locks money in a digital safe box,
            a <strong style={{ color: "#14F195" }}>freelancer</strong> delivers the work,
            and the money is released <strong style={{ color: "#14F195" }}>automatically</strong> — no bank, no PayPal, no middleman, no delays.
          </p>
        </div>
      </section>

      {/* Step by step */}
      <section style={{ maxWidth: 740, margin: "0 auto", padding: "0 1.5rem 3rem" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.4rem" }}>Step by Step</h2>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "2rem" }}>Each step has a simple version and a slightly more detailed version.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
              {/* Step number + line */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: `rgba(${step.color === "#9945FF" ? "153,69,255" : step.color === "#3b82f6" ? "59,130,246" : step.color === "#14F195" ? "20,241,149" : "245,158,11"},0.15)`, border: `2px solid ${step.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
                  {step.emoji}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 32, background: "var(--border)", margin: "6px 0" }} />
                )}
              </div>

              {/* Content */}
              <div className="card" style={{ flex: 1, marginBottom: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `rgba(${step.color === "#9945FF" ? "153,69,255" : step.color === "#3b82f6" ? "59,130,246" : step.color === "#14F195" ? "20,241,149" : "245,158,11"},0.12)`, color: step.color, border: `1px solid ${step.color}40` }}>{step.who}</span>
                  <span style={{ fontSize: "0.65rem", color: "#64748b" }}>Step {i + 1}</span>
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.6rem" }}>{step.title}</h3>

                <div style={{ background: "rgba(20,241,149,0.05)", border: "1px solid rgba(20,241,149,0.15)", borderRadius: 8, padding: "0.7rem 0.9rem", marginBottom: "0.6rem" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#14F195", marginBottom: "0.3rem", letterSpacing: "0.05em" }}>SIMPLE VERSION</div>
                  <p style={{ fontSize: "0.9rem", color: "#cbd5e1", lineHeight: 1.65 }}>{step.simple}</p>
                </div>

                <div style={{ background: "rgba(153,69,255,0.05)", border: "1px solid rgba(153,69,255,0.15)", borderRadius: 8, padding: "0.7rem 0.9rem" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9945FF", marginBottom: "0.3rem", letterSpacing: "0.05em" }}>TECHNICAL VERSION</div>
                  <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.65 }}>{step.normal}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Visual summary */}
      <section style={{ maxWidth: 740, margin: "0 auto", padding: "0 1.5rem 3rem" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1.5rem" }}>The Flow at a Glance</h2>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "wrap", rowGap: "0.5rem" }}>
          {[
            { label: "Client creates\nescrow", color: "#9945FF", emoji: "🔒" },
            { label: "→", color: "#64748b", emoji: null },
            { label: "Freelancer\nsubmits work", color: "#3b82f6", emoji: "✍️" },
            { label: "→", color: "#64748b", emoji: null },
            { label: "Client\napproves", color: "#14F195", emoji: "✅" },
            { label: "→", color: "#64748b", emoji: null },
            { label: "SOL sent\ninstantly", color: "#14F195", emoji: "⚡" },
          ].map((item, i) =>
            item.emoji ? (
              <div key={i} style={{ textAlign: "center", padding: "0.75rem 1rem", background: "var(--bg-card)", border: `1px solid ${item.color}40`, borderRadius: 10, minWidth: 90 }}>
                <div style={{ fontSize: "1.4rem", marginBottom: "0.3rem" }}>{item.emoji}</div>
                <div style={{ fontSize: "0.72rem", color: item.color, fontWeight: 600, whiteSpace: "pre-line", lineHeight: 1.4 }}>{item.label}</div>
              </div>
            ) : (
              <div key={i} style={{ fontSize: "1.2rem", color: "#334155", padding: "0 0.25rem" }}>{item.label}</div>
            )
          )}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 740, margin: "0 auto", padding: "0 1.5rem 3rem" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1.5rem" }}>Common Questions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {QUESTIONS.map((item, i) => (
            <div key={i} className="card">
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", color: "#e2e8f0" }}>
                <span style={{ color: "#9945FF", marginRight: "0.4rem" }}>Q.</span>{item.q}
              </h3>
              <p style={{ fontSize: "0.88rem", color: "#94a3b8", lineHeight: 1.7 }}>
                <span style={{ color: "#14F195", fontWeight: 700, marginRight: "0.4rem" }}>A.</span>{item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 740, margin: "0 auto 4rem", padding: "0 1.5rem" }}>
        <div className="card" style={{ textAlign: "center", padding: "2rem", background: "linear-gradient(135deg, rgba(153,69,255,0.08), rgba(20,241,149,0.04))", border: "1px solid rgba(153,69,255,0.2)" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🚀</div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Ready to try it?</h2>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.25rem" }}>The app runs on Solana Devnet — free test SOL, no real money involved.</p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/client" className="btn btn-primary">I&apos;m a Client</Link>
            <Link href="/freelancer" className="btn btn-outline">I&apos;m a Freelancer</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
