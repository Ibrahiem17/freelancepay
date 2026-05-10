import { useEffect } from "react";

export default function Toast({ msg, onClose }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [msg, onClose]);

  if (!msg) return null;

  return (
    <div className="toast-container">
      <div className={`toast toast-${msg.type}`}>
        <div>{msg.text}</div>
        {msg.signature && (
          <a
            className="toast-link"
            href={`https://explorer.solana.com/tx/${msg.signature}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
          >
            View on Explorer →
          </a>
        )}
      </div>
    </div>
  );
}
