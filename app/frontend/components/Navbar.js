import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import { Bell, PenLine, Zap, RotateCcw, X, CheckCircle } from "lucide-react";
import { useAuthContext } from "@/pages/_app";
import useNotifications from "@/hooks/useNotifications";

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

function relativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Navbar() {
  const { pathname } = useRouter();
  const auth = useAuthContext();
  const user = auth?.user ?? null;

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications({
    enabled: !!user,
  });

  const [open, setOpen] = useState(false);
  const bellRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const linkStyle = (path) => ({
    color: pathname === path ? "var(--ink)" : undefined,
  });

  const recent = notifications.slice(0, 5);

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
          <Link href="/"             style={linkStyle("/")}>Home</Link>
          <Link href="/how-it-works" style={linkStyle("/how-it-works")}>How It Works</Link>
          <Link href="/client"       style={linkStyle("/client")}>Client</Link>
          <Link href="/freelancer"   style={linkStyle("/freelancer")}>Freelancer</Link>
          <Link href="/marketplace"  style={linkStyle("/marketplace")}>Marketplace</Link>
          <Link href="/jobs"         style={linkStyle("/jobs")}>Jobs</Link>
          <span className="devnet-badge">DEVNET</span>

          {user && (
            <div ref={bellRef} style={{ position: "relative" }}>
              <button
                className="btn-bell"
                aria-label="Notifications"
                onClick={() => setOpen((o) => !o)}
              >
                <Bell size={20} strokeWidth={2} />
                {unreadCount > 0 && (
                  <span className="bell-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {open && (
                <div className="notif-dropdown">
                  <div className="notif-dropdown-header">
                    <span className="caption">Notifications</span>
                    {unreadCount > 0 && (
                      <button className="notif-mark-all" onClick={markAllAsRead}>
                        Mark all read
                      </button>
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
                                onClick={() => { if (!n.read) markAsRead(n.id); setOpen(false); }}
                              >
                                {inner}
                              </Link>
                            ) : (
                              <div
                                className="notif-link"
                                onClick={() => { if (!n.read) markAsRead(n.id); }}
                              >
                                {inner}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="notif-dropdown-footer">
                    <Link href="/notifications" onClick={() => setOpen(false)}>
                      View all notifications →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          <WalletMultiButton />
        </div>
      </nav>
    </>
  );
}
