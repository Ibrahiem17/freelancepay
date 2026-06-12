import Head from "next/head";
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

      <footer className="footer" style={{ position: "relative", overflow: "hidden" }}>
        {/* decorative sprinkles */}
        <span className="sprinkle" style={{ left: "8%",  top: "30%", fontSize: "1.1rem", animationDelay: "0s",    animationDuration: "7s"  }}>✿</span>
        <span className="sprinkle" style={{ left: "92%", top: "20%", fontSize: "1rem",   animationDelay: "1.4s",  animationDuration: "9s"  }}>⟡</span>
        <span className="sprinkle" style={{ left: "50%", top: "60%", fontSize: "0.9rem", animationDelay: "0.7s",  animationDuration: "8s"  }}>♡</span>

        <div><strong>FreelancePay</strong> &nbsp;·&nbsp; Built by UMT Lahore for Colosseum Frontier Hackathon</div>
        <div style={{ marginTop: 4 }}>
          Powered by <span>Solana</span> &nbsp;·&nbsp;
          <span style={{ color: "var(--warn)", fontWeight: 700 }}>⚠ Devnet — not real money</span>
        </div>
      </footer>
    </>
  );
}
