import Head from "next/head";
import { AlertTriangle } from "lucide-react";
import Navbar from "./Navbar";
import useNetwork from "@/hooks/useNetwork";

export default function Layout({ children, title = "FreelancePay" }) {
  const { isMainnet, setNetwork } = useNetwork();

  return (
    <>
      {/* Wobbly SVG filter */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <filter id="rough">
            <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="1" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
          </filter>
        </defs>
      </svg>

      <Head>
        <title>{`${title} — FreelancePay`}</title>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Trustless freelance escrow on Solana. Lock SOL, deliver work, get paid instantly." />
      </Head>

      <Navbar />

      {/* Persistent mainnet warning banner — always visible when on Real SOL mode */}
      {isMainnet && (
        <div className="mainnet-banner" role="alert">
          <AlertTriangle size={14} strokeWidth={2.2} style={{ flexShrink: 0 }} />
          <span>
            <strong>⚡ Real Money Mode</strong> — SOL has real monetary value — All transactions are irreversible
          </span>
          <button
            className="mainnet-banner__switch"
            onClick={() => setNetwork("devnet")}
          >
            Switch to Practice Mode
          </button>
        </div>
      )}

      <main style={{ minHeight: "calc(100vh - 90px)" }}>
        {children}
      </main>

      <footer className="footer">
        <div><strong>FreelancePay</strong> &nbsp;·&nbsp; Trustless escrow on Solana</div>
        <div style={{ marginTop: 4 }}>
          Powered by <span>Solana</span> &nbsp;·&nbsp;
          {isMainnet ? (
            <span style={{ color: "var(--err)", fontWeight: 700 }}>
              ⚡ Mainnet — Real SOL
            </span>
          ) : (
            <span style={{ color: "var(--warn)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.3rem", verticalAlign: "middle" }}>
              <AlertTriangle size={13} strokeWidth={2.2} aria-hidden />
              Devnet — not real money
            </span>
          )}
        </div>
        <div style={{ marginTop: 6, fontSize: "0.78rem" }}>
          <a href="/terms" style={{ color: "var(--ink-soft)" }}>Terms</a>
          &nbsp;·&nbsp;
          <a href="/privacy" style={{ color: "var(--ink-soft)" }}>Privacy</a>
          &nbsp;·&nbsp;
          <a href="/disclaimer" style={{ color: "var(--ink-soft)" }}>Disclaimer</a>
          &nbsp;·&nbsp;
          <a href="/SECURITY_REVIEW.md" style={{ color: "var(--ink-soft)" }}>Security</a>
        </div>
        <div style={{ marginTop: 4, fontSize: "0.75rem", color: "var(--ink-soft)" }}>
          Beta software — Use at your own risk
        </div>
      </footer>
    </>
  );
}
