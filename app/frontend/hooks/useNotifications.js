import { useState, useEffect, useCallback, useRef } from "react";

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

export default function useNotifications({ enabled = true } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  const esRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);

  const fetchInitial = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {}
  }, []);

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource("/api/sse/notifications", { withCredentials: true });
    esRef.current = es;
    setConnectionStatus("connecting");

    es.onopen = () => {
      setConnectionStatus("connected");
      reconnectAttemptRef.current = 0; // reset backoff on successful connection
    };

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === "connected") {
          setUnreadCount(data.unreadCount);
          return;
        }
        // New notification pushed from server
        setNotifications((prev) => [data, ...prev]);
        setUnreadCount((c) => c + 1);
      } catch {}
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      setConnectionStatus("disconnected");

      const attempt = reconnectAttemptRef.current;
      if (attempt >= RECONNECT_DELAYS.length) return; // give up after max delay
      const delay = RECONNECT_DELAYS[attempt];
      reconnectAttemptRef.current = attempt + 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    fetchInitial();
    connect();

    return () => {
      if (esRef.current) esRef.current.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const markAsRead = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return;
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  }, []);

  return { notifications, unreadCount, connectionStatus, markAsRead, markAllAsRead };
}
