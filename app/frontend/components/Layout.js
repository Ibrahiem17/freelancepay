import Head from "next/head";
import { AlertTriangle } from "lucide-react";
import Navbar from "./Navbar";

export default function Layout({ children, title = "FreelancePay" }) {
  return (
    <>
      {/* Wobbly SVG filter — reference with filter="url(#rough)" on illustration elements */}
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

      <main style={{ minHeight: "calc(100vh - 90px)" }}>
        {children}
      </main>

      <footer className="footer">
        <div><strong>FreelancePay</strong> &nbsp;·&nbsp; Built by UMT Lahore for Colosseum Frontier Hackathon</div>
        <div style={{ marginTop: 4 }}>
          Powered by <span>Solana</span> &nbsp;·&nbsp;
          <span style={{ color: "var(--warn)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.3rem", verticalAlign: "middle" }}>
            <AlertTriangle size={13} strokeWidth={2.2} aria-hidden />
            Devnet — not real money
          </span>
        </div>
      </footer>
    </>
  );
}
