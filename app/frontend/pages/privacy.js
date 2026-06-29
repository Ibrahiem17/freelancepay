import Layout from "@/components/Layout";

export default function Privacy() {
  return (
    <Layout title="Privacy Policy">
      <article className="legal-page">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: 29 June 2026</p>

        <h2>1. What We Collect</h2>
        <ul>
          <li><strong>Wallet address (public key)</strong> — required to provide the escrow service. This is public information on the Solana blockchain.</li>
          <li><strong>Display name, bio, skills, hourly rate</strong> — optional, provided by you in Settings. Shown on your public profile.</li>
          <li><strong>Email address</strong> — optional. Collected only if you provide it for notifications. Never shared or sold.</li>
          <li><strong>IPFS file URLs</strong> — stored when you upload deliverables. The files themselves are stored on IPFS (a decentralised network).</li>
          <li><strong>Transaction data</strong> — all blockchain transactions are public by nature on the Solana network.</li>
        </ul>

        <h2>2. What We Do NOT Collect</h2>
        <ul>
          <li>Your private key — we never ask for it and have no way to access it</li>
          <li>Payment card information</li>
          <li>Government ID or identity documents</li>
          <li>Location data or IP addresses (beyond what web servers log by default)</li>
          <li>Browsing history outside of FreelancePay</li>
        </ul>

        <h2>3. How We Use Your Data</h2>
        <ul>
          <li>To provide and improve the escrow service</li>
          <li>To send email notifications about your escrows (if you opt in)</li>
          <li>To display your public profile (display name, skills, completed jobs, ratings)</li>
          <li>We never sell, rent, or share your personal data with third parties for marketing</li>
        </ul>

        <h2>4. Data Storage</h2>
        <ul>
          <li><strong>Profile data</strong> — stored in our PostgreSQL database hosted by Supabase (European region)</li>
          <li><strong>File uploads</strong> — stored on IPFS via Pinata; content-addressed and permanent by design</li>
          <li><strong>Blockchain data</strong> — permanently public on the Solana blockchain; cannot be deleted</li>
          <li><strong>Authentication session</strong> — one httpOnly cookie (&ldquo;fp_auth&rdquo;) stored in your browser, expires in 7 days</li>
        </ul>

        <h2>5. Your Rights</h2>
        <ul>
          <li><strong>Delete your profile</strong> — email us and we will remove your off-chain data (display name, email, bio, skills) within 30 days</li>
          <li><strong>Blockchain data</strong> — transaction history on the Solana blockchain is permanent and cannot be deleted by anyone</li>
          <li><strong>Request your data</strong> — email us for a copy of all data we hold about your wallet address</li>
          <li><strong>Opt out of email</strong> — use the unsubscribe link in any notification email, or update settings in your account</li>
        </ul>

        <h2>6. Third-Party Services</h2>
        <p>FreelancePay uses the following third-party services:</p>
        <ul>
          <li><a href="https://pinata.cloud/privacy" target="_blank" rel="noopener noreferrer">Pinata</a> — IPFS file storage</li>
          <li><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase</a> — PostgreSQL database hosting</li>
          <li><a href="https://resend.com/privacy" target="_blank" rel="noopener noreferrer">Resend</a> — transactional email delivery</li>
          <li><a href="https://solana.com/privacy" target="_blank" rel="noopener noreferrer">Solana Foundation</a> — the underlying blockchain network</li>
          <li><a href="https://helius.dev" target="_blank" rel="noopener noreferrer">Helius</a> — Solana RPC provider</li>
        </ul>

        <h2>7. Cookies</h2>
        <p>We use one cookie:</p>
        <ul>
          <li><strong>fp_auth</strong> — authentication session token, httpOnly, 7-day expiry. Required to stay logged in.</li>
        </ul>
        <p>No tracking cookies. No advertising cookies. No analytics cookies.</p>

        <h2>8. Contact</h2>
        <p>
          For privacy requests: <a href="mailto:Ibrahiem61@icloud.com">Ibrahiem61@icloud.com</a><br />
          University of Management &amp; Technology (UMT), Lahore, Pakistan
        </p>
      </article>
    </Layout>
  );
}
