import Link from "next/link";
import Layout from "@/components/Layout";
import { Users, Lock, PenLine, CheckCircle, RotateCcw, Lightbulb, Brain, Send } from "lucide-react";

const STEPS = [
  {
    Icon: Users,
    who: "Client",
    color: "var(--lav)",
    bgLo: "var(--lav-lo)",
    title: "Client hires a freelancer",
    simple: "Imagine you want someone to build you a website. You find a freelancer and agree on a price — let's say 1 SOL.",
    normal: "The client creates an escrow contract on FreelancePay, enters the freelancer's wallet address and the agreed amount.",
  },
  {
    Icon: Lock,
    who: "Money gets locked",
    color: "var(--sky)",
    bgLo: "var(--sky-lo)",
    title: "SOL is locked in a safe box",
    simple: "Instead of paying the freelancer right away (what if they disappear?), the money goes into a digital safe box on Solana. Nobody can touch it — not even you.",
    normal: "The SOL is transferred into a Program Derived Account (PDA) — a smart contract vault that only releases funds when both parties complete their role.",
  },
  {
    Icon: PenLine,
    who: "Freelancer",
    color: "var(--leaf)",
    bgLo: "var(--sage-lo)",
    title: "Freelancer does the work",
    simple: "The freelancer builds the website. When done, they press 'Submit Work' and write what they delivered — like a GitHub link or a description. This gets saved on Solana forever.",
    normal: "The freelancer calls the submit_work instruction, recording their delivery note permanently on-chain. The escrow status changes from Active → Submitted.",
  },
  {
    Icon: CheckCircle,
    who: "Client",
    color: "var(--leaf)",
    bgLo: "var(--sage-lo)",
    title: "Client checks and approves",
    simple: "You look at the work. Happy with it? Click 'Approve'. The money instantly flies from the safe box straight into the freelancer's wallet. Done!",
    normal: "The client calls approve_work. The smart contract closes the escrow account and transfers the full SOL balance to the freelancer's wallet in the same transaction.",
  },
  {
    Icon: RotateCcw,
    who: "Client",
    color: "var(--orange)",
    bgLo: "var(--peach-lo)",
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

const FLOW = [
  { label: "Client creates\nescrow",    Icon: Lock,         color: "var(--lav)",    bgLo: "var(--lav-lo)"  },
  { label: null,                         Icon: null,          color: "var(--ink-soft)", bgLo: null            },
  { label: "Freelancer\nsubmits work",  Icon: PenLine,      color: "var(--sky)",    bgLo: "var(--sky-lo)"  },
  { label: null,                         Icon: null,          color: "var(--ink-soft)", bgLo: null            },
  { label: "Client\napproves",          Icon: CheckCircle,  color: "var(--leaf)",   bgLo: "var(--sage-lo)" },
  { label: null,                         Icon: null,          color: "var(--ink-soft)", bgLo: null            },
  { label: "SOL sent\ninstantly",       Icon: Send,         color: "var(--leaf)",   bgLo: "var(--sage-lo)" },
];

export default function HowItWorks() {
  return (
    <Layout title="How It Works">
      {/* Hero */}
      <section style={{ textAlign: "center", padding: "4rem 1.5rem 2.5rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 40% at 50% 0%, var(--lav-lo) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div data-enter style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
          <div className="icon-badge icon-badge--lav" style={{ width: 56, height: 56 }}>
            <Brain size={28} strokeWidth={2} aria-hidden />
          </div>
        </div>
        <h1 data-enter style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, marginBottom: "1rem", lineHeight: 1.2, fontFamily: "var(--font-display)" }}>
          How FreelancePay Works
        </h1>
        <p data-enter style={{ fontSize: "1.1rem", color: "var(--ink-soft)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7, fontWeight: 600 }}>
          Explained so simply that even a 10-year-old could understand it.
          <br />No jargon. No fluff. Just the idea.
        </p>
      </section>

      {/* The core idea */}
      <section style={{ maxWidth: 740, margin: "0 auto", padding: "0 1.5rem 3rem" }}>
        <div className="card" data-reveal="pop" style={{ textAlign: "center", padding: "2rem", background: "var(--lav-lo)", border: "3px dashed var(--lav)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem" }}>
            <div className="icon-badge icon-badge--lav">
              <Lightbulb size={22} strokeWidth={2.2} aria-hidden />
            </div>
          </div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.75rem", fontFamily: "var(--font-display)" }}>
            The Big Idea in One Sentence
          </h2>
          <p style={{ fontSize: "1rem", color: "var(--ink)", lineHeight: 1.8, fontWeight: 600 }}>
            A <strong style={{ color: "var(--lav)" }}>client</strong> locks money in a digital safe box,
            a <strong style={{ color: "var(--leaf)" }}>freelancer</strong> delivers the work,
            and the money is released <strong style={{ color: "var(--leaf)" }}>automatically</strong> — no bank, no PayPal, no middleman, no delays.
          </p>
        </div>
      </section>

      {/* Step by step */}
      <section style={{ maxWidth: 740, margin: "0 auto", padding: "0 1.5rem 3rem" }}>
        <h2 data-reveal style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.4rem", fontFamily: "var(--font-display)" }}>
          Step by Step
        </h2>
        <p data-reveal style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginBottom: "2rem", fontWeight: 600 }}>
          Each step has a simple version and a slightly more detailed version.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {STEPS.map((step, i) => {
            const { Icon } = step;
            return (
              <div key={i} data-reveal="rise" style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
                {/* Step dot + connector */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div className="icon-badge" style={{ background: step.bgLo, border: `3px solid ${step.color}` }}>
                    <Icon size={20} strokeWidth={2.2} style={{ color: step.color }} aria-hidden />
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 2, flex: 1, minHeight: 32, background: "var(--line)", margin: "6px 0" }} />
                  )}
                </div>

                {/* Content */}
                <div className="card" style={{ flex: 1, marginBottom: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span style={{
                      fontSize: "0.7rem", fontWeight: 800, padding: "2px 10px", borderRadius: 999,
                      background: step.bgLo, color: step.color, border: `2px solid ${step.color}`,
                      fontFamily: "var(--font-body)",
                    }}>
                      {step.who}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: "var(--ink-soft)", fontWeight: 600 }}>Step {i + 1}</span>
                  </div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.6rem", fontFamily: "var(--font-display)" }}>
                    {step.title}
                  </h3>

                  <div style={{ background: "var(--sage-lo)", border: "2.5px dashed var(--sage)", borderRadius: "var(--r-sm)", padding: "0.7rem 0.9rem", marginBottom: "0.6rem" }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--leaf)", marginBottom: "0.3rem", letterSpacing: "0.06em", fontFamily: "var(--font-body)" }}>
                      SIMPLE VERSION
                    </div>
                    <p style={{ fontSize: "0.9rem", color: "var(--ink)", lineHeight: 1.65, fontWeight: 600, margin: 0 }}>{step.simple}</p>
                  </div>

                  <div style={{ background: "var(--lav-lo)", border: "2.5px dashed var(--lav)", borderRadius: "var(--r-sm)", padding: "0.7rem 0.9rem" }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--lav)", marginBottom: "0.3rem", letterSpacing: "0.06em", fontFamily: "var(--font-body)" }}>
                      TECHNICAL VERSION
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", lineHeight: 1.65, fontWeight: 600, margin: 0 }}>{step.normal}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Visual flow summary */}
      <section style={{ maxWidth: 740, margin: "0 auto", padding: "0 1.5rem 3rem" }}>
        <h2 data-reveal style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1.5rem", fontFamily: "var(--font-display)" }}>
          The Flow at a Glance
        </h2>
        <div data-reveal="zoom" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "wrap", rowGap: "0.5rem" }}>
          {FLOW.map((item, i) =>
            item.Icon ? (
              <div key={i} style={{
                textAlign: "center", padding: "0.75rem 1rem",
                background: item.bgLo,
                border: `2.5px dashed ${item.color}`,
                borderRadius: "var(--r-sm)", minWidth: 90,
              }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.4rem" }}>
                  <item.Icon size={22} strokeWidth={2.1} style={{ color: item.color }} aria-hidden />
                </div>
                <div style={{ fontSize: "0.72rem", color: item.color, fontWeight: 700, whiteSpace: "pre-line", lineHeight: 1.4, fontFamily: "var(--font-body)" }}>
                  {item.label}
                </div>
              </div>
            ) : (
              <div key={i} style={{ fontSize: "1rem", color: "var(--ink-soft)", padding: "0 0.25rem", fontWeight: 700 }}>
                →
              </div>
            )
          )}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 740, margin: "0 auto", padding: "0 1.5rem 3rem" }}>
        <h2 data-reveal style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1.5rem", fontFamily: "var(--font-display)" }}>
          Common Questions
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {QUESTIONS.map((item, i) => (
            <div key={i} className="card" data-reveal="rise">
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--ink)", fontFamily: "var(--font-display)" }}>
                <span style={{ color: "var(--lav)", marginRight: "0.4rem" }}>Q.</span>{item.q}
              </h3>
              <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)", lineHeight: 1.7, fontWeight: 600, margin: 0 }}>
                <span style={{ color: "var(--leaf)", fontWeight: 800, marginRight: "0.4rem" }}>A.</span>{item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 740, margin: "0 auto 4rem", padding: "0 1.5rem" }}>
        <div className="card" data-reveal="pop" style={{ textAlign: "center", padding: "2rem", background: "var(--lav-lo)", border: "3px dashed var(--lav)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
            <div className="icon-badge icon-badge--sky">
              <Send size={20} strokeWidth={2.2} aria-hidden />
            </div>
          </div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>
            Ready to try it?
          </h2>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginBottom: "1.25rem", fontWeight: 600 }}>
            The app runs on Solana Devnet — free test SOL, no real money involved.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/client"     className="btn btn-primary magnetic">I&apos;m a Client</Link>
            <Link href="/freelancer" className="btn btn-outline magnetic">I&apos;m a Freelancer</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
