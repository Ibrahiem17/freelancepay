import Layout from "@/components/Layout";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function Disclaimer() {
  return (
    <Layout title="Beta Disclaimer">
      <article className="legal-page">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <AlertTriangle size={28} strokeWidth={2} style={{ color: "var(--err)", flexShrink: 0 }} />
          <h1 style={{ margin: 0 }}>Beta Software Disclaimer</h1>
        </div>
        <p className="legal-updated">Last updated: 29 June 2026</p>

        <div className="legal-warn">
          <strong>⚠️ Read This Before Using Real SOL</strong>
          FreelancePay handles real money on Solana Mainnet. This is experimental software
          built by students. Only use funds you can afford to lose entirely.
        </div>

        <h2>What FreelancePay Is</h2>
        <p>
          FreelancePay is an open-source freelance escrow dApp built on the Solana blockchain.
          It was created as a hackathon project by students at the University of Management &amp;
          Technology (UMT), Lahore, Pakistan, for the Colosseum Frontier Hackathon.
        </p>

        <h2>Security Status</h2>
        <ul>
          <li><strong>No professional audit</strong> — the smart contract has not been reviewed by a paid, professional security firm.</li>
          <li><strong>Community review conducted</strong> — an internal security review was performed by the development team. See <Link href="/security-review">Security Review</Link> for findings.</li>
          <li><strong>Automated tools run</strong> — Clippy (Rust linter) and manual checklist completed with no CRITICAL or HIGH findings.</li>
          <li>All MEDIUM findings were fixed before mainnet deployment.</li>
        </ul>

        <h2>Known Limitations</h2>
        <ul>
          <li><strong>No dispute resolution</strong> — if a client refuses to approve work and won&apos;t cancel, funds are locked indefinitely. There is no timeout, arbitrator, or escape hatch.</li>
          <li><strong>No recovery</strong> — if you lose access to your wallet, your funds inside escrows cannot be recovered by anyone.</li>
          <li><strong>Wrong address = lost funds</strong> — entering the wrong freelancer wallet address when creating an escrow can result in permanent loss.</li>
          <li><strong>Transaction cap during beta</strong> — a maximum of {process.env.NEXT_PUBLIC_MAINNET_MAX_SOL || "5"} SOL per escrow is enforced during the beta period to limit exposure if a bug is found.</li>
          <li><strong>Real-time sync is limited</strong> — the indexer syncs escrow state once daily. The SSE real-time push works while a browser tab is open but is not guaranteed in production serverless environments.</li>
        </ul>

        <h2>What Happens If a Bug Is Found</h2>
        <p>
          If a critical bug is discovered while funds are locked in escrow:
        </p>
        <ul>
          <li>We will immediately disable mainnet access (set to whitelist-only mode) to prevent new funds from being locked.</li>
          <li>We will post a public notice on all channels.</li>
          <li>Funds already inside smart contracts cannot be moved except through the contract&apos;s own rules &mdash; we cannot forcibly recover or move them on your behalf.</li>
          <li>We will contact the Solana security team if appropriate.</li>
        </ul>

        <h2>Recommended Usage</h2>
        <ul>
          <li>Start with small amounts (0.01 – 0.1 SOL) until you are confident in the platform.</li>
          <li>Use only SOL you can afford to lose.</li>
          <li>Verify the counterparty&apos;s wallet address carefully before creating an escrow.</li>
          <li>Both parties should agree on the scope of work before the escrow is created.</li>
        </ul>

        <h2>Open Source</h2>
        <p>
          FreelancePay is open source. You can review the smart contract code yourself
          before trusting it with your funds.
        </p>

        <h2>Contact</h2>
        <p>
          For security concerns: <a href="mailto:Ibrahiem61@icloud.com">Ibrahiem61@icloud.com</a>
        </p>

        <p style={{ marginTop: "2.5rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
          By using FreelancePay on Mainnet, you acknowledge that you have read this disclaimer
          and accept all risks. See also: <Link href="/terms">Terms of Service</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </article>
    </Layout>
  );
}
