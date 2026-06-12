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

  const linkStyle = (path) => ({
    color: pathname === path ? "var(--ink)" : undefined,
  });

  return (
    <>
      <div className="umt-banner">
        <strong>University of Management &amp; Technology (UMT)</strong>, Lahore
        &nbsp;·&nbsp; Colosseum Frontier Hackathon &nbsp;·&nbsp; Superteam Pakistan
      </div>

      <nav className="navbar">
        <Link href="/" className="navbar-logo" style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <Image src="/logo.svg" alt="FreelancePay" width={34} height={34} />
          FreelancePay
        </Link>

        <div className="navbar-links">
          <Link href="/"            style={linkStyle("/")}>Home</Link>
          <Link href="/how-it-works" style={linkStyle("/how-it-works")}>How It Works</Link>
          <Link href="/client"      style={linkStyle("/client")}>Client</Link>
          <Link href="/freelancer"  style={linkStyle("/freelancer")}>Freelancer</Link>
          <span className="devnet-badge devnet-stamp">Practice Mode</span>
          <WalletMultiButton />
        </div>
      </nav>
    </>
  );
}
