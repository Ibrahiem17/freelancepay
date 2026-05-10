import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

export default function Navbar() {
  const { pathname } = useRouter();

  return (
    <>
      <div className="umt-banner">
        <strong>University of Management &amp; Technology (UMT)</strong>, Lahore &nbsp;·&nbsp; Colosseum Frontier Hackathon &nbsp;·&nbsp; Superteam Pakistan
      </div>
      <nav className="navbar">
        <Link href="/" className="navbar-logo" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Image src="/logo.svg" alt="FreelancePay" width={36} height={36} />
          FreelancePay
        </Link>

        <div className="navbar-links">
          <Link href="/" style={{ color: pathname === "/" ? "#e2e8f0" : undefined }}>Home</Link>
          <Link href="/how-it-works" style={{ color: pathname === "/how-it-works" ? "#e2e8f0" : undefined }}>How It Works</Link>
          <Link href="/client" style={{ color: pathname === "/client" ? "#e2e8f0" : undefined }}>Client</Link>
          <Link href="/freelancer" style={{ color: pathname === "/freelancer" ? "#e2e8f0" : undefined }}>Freelancer</Link>
          <span className="devnet-badge">DEVNET</span>
          <WalletMultiButton />
        </div>
      </nav>
    </>
  );
}
