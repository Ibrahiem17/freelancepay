import Layout from "@/components/Layout";
import Link from "next/link";

export default function Terms() {
  return (
    <Layout title="Terms of Service">
      <article className="legal-page">
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: 29 June 2026</p>

        <div className="legal-warn">
          <strong>⚠️ Beta Software Warning</strong>
          FreelancePay is beta software. Smart contracts may contain bugs. Use only funds
          you can afford to lose. The team is not liable for any loss of funds due to bugs,
          exploits, or misuse.
        </div>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By using FreelancePay (the &ldquo;Service&rdquo;), you agree to be bound by these Terms of
          Service. If you do not agree, do not use the Service.
        </p>

        <h2>2. What FreelancePay Is</h2>
        <ul>
          <li>FreelancePay is a software interface to Solana blockchain smart contracts.</li>
          <li>FreelancePay does <strong>not</strong> hold, control, or have custody of any funds.</li>
          <li>Funds are held in smart contract code that no one &mdash; including FreelancePay &mdash; controls.</li>
          <li>FreelancePay charges 0% fees.</li>
          <li>FreelancePay is not a bank, financial institution, exchange, or money services business.</li>
        </ul>

        <h2>3. Beta Software Warning</h2>
        <ul>
          <li>FreelancePay is beta software and may contain bugs or security vulnerabilities.</li>
          <li>Use only funds you can afford to lose entirely.</li>
          <li>No warranty or guarantee of any kind is provided, express or implied.</li>
          <li>The FreelancePay team is not liable for any loss of funds due to bugs, exploits, or misuse.</li>
          <li>No professional security audit has been performed. A community security review was conducted &mdash; see <Link href="/disclaimer">Disclaimer</Link>.</li>
        </ul>

        <h2>4. Your Responsibilities</h2>
        <ul>
          <li>You are responsible for the security of your wallet and private keys. We cannot recover lost wallets.</li>
          <li>You are responsible for verifying the counterparty&apos;s wallet address before creating an escrow. Incorrect addresses cannot be corrected.</li>
          <li>Freelancers are responsible for the quality and delivery of their work.</li>
          <li>Clients are responsible for making reasonable approval decisions in good faith.</li>
          <li>You must be at least 18 years old to use the Service.</li>
        </ul>

        <h2>5. Prohibited Uses</h2>
        <p>You may not use FreelancePay for:</p>
        <ul>
          <li>Illegal goods or services</li>
          <li>Money laundering or financing terrorism</li>
          <li>Fraud, misrepresentation, or deception of any kind</li>
          <li>Any activity illegal in the user&apos;s jurisdiction or internationally</li>
          <li>Attempting to exploit or attack the smart contracts or platform</li>
        </ul>

        <h2>6. Dispute Resolution</h2>
        <ul>
          <li>FreelancePay has <strong>no dispute resolution mechanism</strong>.</li>
          <li>Once locked, funds can only move according to smart contract rules.</li>
          <li>FreelancePay cannot intervene in disputes between clients and freelancers.</li>
          <li>Users are solely responsible for resolving disputes directly between themselves.</li>
          <li>If a client refuses to approve work and will not cancel, funds remain locked indefinitely. There is no timeout or arbitration mechanism.</li>
        </ul>

        <h2>7. Intellectual Property</h2>
        <ul>
          <li>Freelancers represent and warrant that they have all rights to the work they submit.</li>
          <li>Clients do not acquire rights to submitted work until payment is released via smart contract.</li>
        </ul>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, FreelancePay and its developers are not liable
          for any indirect, incidental, special, consequential, or punitive damages, or any loss
          of funds, data, or profits arising out of or in connection with your use of the Service.
        </p>

        <h2>9. Changes to Terms</h2>
        <p>
          We may update these terms at any time. Continued use of the Service after changes
          constitutes acceptance of the updated terms.
        </p>

        <h2>10. Governing Law</h2>
        <p>
          These terms are governed by applicable law. Any disputes shall be resolved by the
          parties in good faith, or through binding arbitration where required by local law.
        </p>

        <h2>11. Contact</h2>
        <p>
          University of Management &amp; Technology (UMT), Lahore, Pakistan<br />
          Email: <a href="mailto:Ibrahiem61@icloud.com">Ibrahiem61@icloud.com</a>
        </p>
      </article>
    </Layout>
  );
}
