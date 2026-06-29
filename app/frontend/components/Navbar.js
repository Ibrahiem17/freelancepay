import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import {
  Bell, PenLine, Zap, RotateCcw, X, CheckCircle,
  Menu, ChevronDown, User, Settings, BarChart2, LogOut,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuthContext } from "@/pages/_app";
import useNotifications from "@/hooks/useNotifications";
import ThemeToggle from "@/components/ThemeToggle";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

const TYPE_ICON = {
  WORK_SUBMITTED:     PenLine,
  PAYMENT_RELEASED:   Zap,
  REVISION_REQUESTED: RotateCcw,
  ESCROW_CANCELLED:   X,
  WORK_APPROVED:      CheckCircle,
  ESCROW_CREATED:     Bell,
};

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function truncWallet(addr) {
  return addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : "";
}

export default function Navbar() {
  const { pathname } = useRouter();
  const { connected } = useWallet();
  const auth = useAuthContext();
  const user = auth?.user ?? null;

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications({
    enabled: !!user,
  });

  const [bellOpen, setBellOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const bellRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    function handle(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const isActive = (path) => pathname === path ? { color: "var(--ink)" } : {};
  const initial  = user?.wallet?.slice(0, 1).toUpperCase() || "?";
  const hue      = user?.wallet ? (user.wallet.charCodeAt(0) * 37) % 360 : 0;
  const recent   = notifications.slice(0, 5);

  const centerLinks = [
    { href: "/",             label: "Home" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/marketplace",  label: "Marketplace", testid: "nav-marketplace" },
    { href: "/jobs",         label: "Jobs",         testid: "nav-jobs" },
    ...(connected ? [
      { href: "/client",     label: "Client" },
      { href: "/freelancer", label: "Freelancer" },
      { href: "/analytics",  label: "Analytics" },
    ] : []),
  ];

  return (
    <>
      <div className="umt-banner">
        <strong>University of Management &amp; Technology (UMT)</strong>, Lahore
        &nbsp;·&nbsp; Colosseum Frontier Hackathon &nbsp;·&nbsp; Superteam Pakistan
      </div>

      <nav className="navbar">
        {/* Left: Logo — flex:1 so center links stay centred */}
        <Link href="/" className="navbar-logo" style={{ display: "flex", alignItems: "center", gap: "0.45rem", flex: "1 1 0" }}>
          <Image src="/logo.svg" alt="FreelancePay" width={34} height={34} />
          FreelancePay
        </Link>

        {/* Center: Nav links */}
        <div className="navbar-links">
          {centerLinks.map(({ href, label, testid }) => (
            <Link key={href} href={href} style={isActive(href)} data-testid={testid || undefined}>
              {label}
            </Link>
          ))}
          <span className="devnet-badge">DEVNET</span>
        </div>

        {/* Right: bell + user/wallet + hamburger — flex:1 justified end */}
        <div className="navbar-right">

          <ThemeToggle />

          {/* Notification bell */}
          {user && (
            <div ref={bellRef} style={{ position: "relative" }}>
              <button
                className="btn-bell"
                aria-label="Notifications"
                data-testid="notification-bell"
                onClick={() => setBellOpen((o) => !o)}
              >
                <Bell size={20} strokeWidth={2} />
                {unreadCount > 0 && (
                  <span className="bell-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                )}
              </button>

              {bellOpen && (
                <div className="notif-dropdown">
                  <div className="notif-dropdown-header">
                    <span className="caption">Notifications</span>
                    {unreadCount > 0 && (
                      <button className="notif-mark-all" onClick={markAllAsRead}>Mark all read</button>
                    )}
                  </div>

                  {recent.length === 0 ? (
                    <div className="notif-empty">
                      <Bell size={28} style={{ color: "var(--ink-soft)", display: "block", margin: "0 auto .5rem" }} />
                      <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem", margin: 0 }}>No notifications yet</p>
                    </div>
                  ) : (
                    <ul className="notif-list">
                      {recent.map((n) => {
                        const Icon = TYPE_ICON[n.type] || Bell;
                        const inner = (
                          <>
                            <span className="notif-icon"><Icon size={15} strokeWidth={2} /></span>
                            <span className="notif-body">
                              <span className="notif-title">{n.title}</span>
                              <span className="notif-msg">{n.message}</span>
                              <span className="notif-time">{relativeTime(n.createdAt)}</span>
                            </span>
                          </>
                        );
                        return (
                          <li key={n.id} className={`notif-item${n.read ? "" : " notif-item--unread"}`}>
                            {n.escrowPda ? (
                              <Link
                                href={`/escrow/${n.escrowPda}`}
                                className="notif-link"
                                onClick={() => { if (!n.read) markAsRead(n.id); setBellOpen(false); }}
                              >
                                {inner}
                              </Link>
                            ) : (
                              <div className="notif-link" onClick={() => { if (!n.read) markAsRead(n.id); }}>
                                {inner}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="notif-dropdown-footer">
                    <Link href="/notifications" onClick={() => setBellOpen(false)}>
                      View all notifications →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User dropdown OR connect wallet button */}
          {user ? (
            <div ref={dropRef} style={{ position: "relative" }}>
              <button className="user-avatar-btn" onClick={() => setDropOpen((o) => !o)} aria-label="Account menu">
                <div className="user-avatar" style={{ background: `hsl(${hue},55%,78%)` }}>{initial}</div>
                <span className="user-wallet-trunc">{truncWallet(user.wallet)}</span>
                <ChevronDown size={13} strokeWidth={2.5} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />
              </button>

              {dropOpen && (
                <div className="user-dropdown-menu">
                  <div className="user-dropdown-header">
                    <div className="user-avatar user-avatar--lg" style={{ background: `hsl(${hue},55%,78%)` }}>{initial}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{truncWallet(user.wallet)}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--ink-soft)", fontWeight: 600 }}>Authenticated</div>
                    </div>
                  </div>
                  <div className="user-dropdown-divider" />
                  <Link className="user-dropdown-item" href={`/profile/${user.wallet}`} onClick={() => setDropOpen(false)}>
                    <User size={14} strokeWidth={2} /> My Profile
                  </Link>
                  <Link className="user-dropdown-item" href="/settings" onClick={() => setDropOpen(false)}>
                    <Settings size={14} strokeWidth={2} /> Settings
                  </Link>
                  <Link className="user-dropdown-item" href="/analytics" onClick={() => setDropOpen(false)}>
                    <BarChart2 size={14} strokeWidth={2} /> Analytics
                  </Link>
                  <div className="user-dropdown-divider" />
                  <button
                    className="user-dropdown-item user-dropdown-item--danger"
                    onClick={() => { auth.signOut(); setDropOpen(false); }}
                  >
                    <LogOut size={14} strokeWidth={2} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div data-testid="connect-wallet-btn">
              <WalletMultiButton />
            </div>
          )}

          {/* Hamburger — visible only on mobile */}
          <button
            className="navbar-hamburger"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="navbar-mobile-menu">
          {centerLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
              {label}
            </Link>
          ))}
          {user ? (
            <>
              <div className="mobile-nav-divider" />
              <Link href={`/profile/${user.wallet}`} className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
                My Profile
              </Link>
              <Link href="/settings" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
                Settings
              </Link>
              <button
                className="mobile-nav-link mobile-nav-link--danger"
                onClick={() => { auth.signOut(); setMenuOpen(false); }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <div style={{ padding: "0.75rem 1.25rem" }}>
              <WalletMultiButton />
            </div>
          )}
        </div>
      )}
    </>
  );
}
