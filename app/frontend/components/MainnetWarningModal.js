import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function MainnetWarningModal({ onConfirm, onCancel }) {
  const [checks, setChecks] = useState({ age: false, loss: false, afford: false });
  const [inputVal, setInputVal] = useState("");

  const allChecked = checks.age && checks.loss && checks.afford;
  const confirmed = allChecked && inputVal === "I understand";

  const toggle = (key) => setChecks((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="mainnet-warning-title">
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <button className="modal-close-btn" onClick={onCancel} aria-label="Cancel">
          <X size={18} strokeWidth={2} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <AlertTriangle size={22} strokeWidth={2} style={{ color: "var(--err)", flexShrink: 0 }} />
          <h2 id="mainnet-warning-title" style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
            Switching to Real Money Mode
          </h2>
        </div>

        <div className="mainnet-warning-box">
          <p style={{ margin: 0, fontWeight: 600, marginBottom: "0.6rem" }}>
            You are about to switch to Solana Mainnet. In this mode:
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.7 }}>
            <li>SOL has <strong>real monetary value</strong>. Transactions cannot be undone.</li>
            <li>Funds locked in escrow can only be released by the contract rules.</li>
            <li>FreelancePay is <strong>beta software</strong>. Use only what you can afford to lose.</li>
            <li>No one can recover your funds if you make a mistake or a bug exists.</li>
            <li>FreelancePay takes 0% fees but also provides <strong>no guarantees</strong>.</li>
          </ul>
        </div>

        <div className="mainnet-checklist">
          <label className="mainnet-check-item">
            <input
              type="checkbox"
              checked={checks.age}
              onChange={() => toggle("age")}
            />
            I am at least 18 years old
          </label>
          <label className="mainnet-check-item">
            <input
              type="checkbox"
              checked={checks.loss}
              onChange={() => toggle("loss")}
            />
            I understand that locked SOL cannot be recovered if something goes wrong
          </label>
          <label className="mainnet-check-item">
            <input
              type="checkbox"
              checked={checks.afford}
              onChange={() => toggle("afford")}
            />
            I am using SOL that I can afford to lose
          </label>
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--ink-soft)" }}>
            Type <strong style={{ color: "var(--ink)" }}>&ldquo;I understand&rdquo;</strong> to continue
          </label>
          <input
            type="text"
            className="input"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="I understand"
            autoComplete="off"
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn--outline" onClick={onCancel} style={{ flex: 1 }}>
            Cancel — Stay in Practice Mode
          </button>
          <button
            className="btn btn--danger"
            onClick={onConfirm}
            disabled={!confirmed}
            style={{ flex: 1 }}
          >
            Switch to Real SOL
          </button>
        </div>
      </div>
    </div>
  );
}
