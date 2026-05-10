import Head from "next/head";
import Navbar from "./Navbar";

export default function Layout({ children, title = "FreelancePay" }) {
  return (
    <>
      <Head>
        <title>{title} — FreelancePay</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Trustless freelance escrow on Solana. Lock SOL, deliver work, get paid instantly." />
      </Head>
      <Navbar />
      <div style={{ minHeight: "calc(100vh - 90px)" }}>
        {children}
      </div>
      <footer className="footer">
        <div><strong style={{ color: "#e2e8f0" }}>FreelancePay</strong> &nbsp;·&nbsp; Built by UMT Lahore for Colosseum Frontier Hackathon</div>
        <div style={{ marginTop: 4 }}>Powered by <span>Solana</span> &nbsp;·&nbsp; <span style={{ color: "#f59e0b" }}>⚠ Devnet — not real money</span></div>
      </footer>
    </>
  );
}
