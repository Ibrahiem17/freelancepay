import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Bell, PenLine, Zap, RotateCcw, X, CheckCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuthContext } from "@/pages/_app";
import useNotifications from "@/hooks/useNotifications";

const TYPE_ICON = {
  WORK_SUBMITTED:     PenLine,
  PAYMENT_RELEASED:   Zap,
  REVISION_REQUESTED: RotateCcw,
  ESCROW_CANCELLED:   X,
  WORK_APPROVED:      CheckCircle,
  ESCROW_CREATED:     Bell,
};

const TYPE_COLOR = {
  WORK_SUBMITTED:     "var(--sky)",
  PAYMENT_RELEASED:   "var(--sage)",
  REVISION_REQUESTED: "var(--peach)",
  ESCROW_CANCELLED:   "var(--pink)",
  WORK_APPROVED:      "var(--sage)",
  ESCROW_CREATED:     "var(--lav)",
};

const TABS = [
  { key: "all",      label: "All" },
  { key: "unread",   label: "Unread" },
  { key: "work",     label: "Work Updates" },
  { key: "payments", label: "Payments" },
];

const TAB_TYPES = {
  all:      null,
  unread:   null,
  work:     new Set(["WORK_SUBMITTED", "REVISION_REQUESTED", "WORK_APPROVED"]),
  payments: new Set(["PAYMENT_RELEASED", "ESCROW_CANCELLED", "ESCROW_CREATED"]),
};

function relativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

export default function NotificationsPage() {
  const router = useRouter();
  const auth = useAuthContext();
  const user = auth?.user ?? null;

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications({
    enabled: !!user,
  });

  const [activeTab, setActiveTab] = useState("all");

  // Redirect unauthenticated users (wait for sign-in to fully complete first)
  if (typeof window !== "undefined" && !auth?.loading && !auth?.signingIn && !user) {
    router.replace("/");
    return null;
  }

  const filtered = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    const allowed = TAB_TYPES[activeTab];
    if (allowed) return allowed.has(n.type);
    return true;
  });

  return (
    <Layout>
      <div className="page" style={{ maxWidth: 680 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <p className="eyebrow">Inbox</p>
            <h1 style={{ fontSize: "var(--fs-h2)" }}>Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button className="btn btn--outline" onClick={markAllAsRead}>
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="notif-tabs">
          {TABS.map((tab) => {
            const count = tab.key === "unread" ? unreadCount : null;
            return (
              <button
                key={tab.key}
                className={`notif-tab${activeTab === tab.key ? " notif-tab--active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {count != null && count > 0 && (
                  <span className="notif-tab-badge">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notification list */}
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <Bell size={40} style={{ color: "var(--ink-soft)", margin: "0 auto 1rem" }} />
            <p className="muted" style={{ margin: 0 }}>
              {activeTab === "unread" ? "All caught up!" : "No notifications yet"}
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {filtered.map((n) => {
              const Icon = TYPE_ICON[n.type] || Bell;
              const iconColor = TYPE_COLOR[n.type] || "var(--lav)";
              return (
                <li key={n.id}>
                  {n.escrowPda ? (
                    <Link
                      href={`/escrow/${n.escrowPda}`}
                      className={`notif-page-item${n.read ? "" : " notif-page-item--unread"}`}
                      onClick={() => { if (!n.read) markAsRead(n.id); }}
                    >
                      <span className="notif-page-icon" style={{ background: iconColor }}>
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <span className="notif-page-body">
                        <span className="notif-page-title">{n.title}</span>
                        <span className="notif-page-msg">{n.message}</span>
                        <span className="notif-page-time">{relativeTime(n.createdAt)}</span>
                      </span>
                      {!n.read && <span className="notif-unread-dot" />}
                    </Link>
                  ) : (
                    <div
                      className={`notif-page-item${n.read ? "" : " notif-page-item--unread"}`}
                      onClick={() => { if (!n.read) markAsRead(n.id); }}
                      style={{ cursor: "default" }}
                    >
                      <span className="notif-page-icon" style={{ background: iconColor }}>
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <span className="notif-page-body">
                        <span className="notif-page-title">{n.title}</span>
                        <span className="notif-page-msg">{n.message}</span>
                        <span className="notif-page-time">{relativeTime(n.createdAt)}</span>
                      </span>
                      {!n.read && <span className="notif-unread-dot" />}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Layout>
  );
}
