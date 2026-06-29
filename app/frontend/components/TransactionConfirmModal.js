import { AlertTriangle, X } from "lucide-react";
import useSolanaPrice from "@/hooks/useSolanaPrice";

const ACTION_LABELS = {
  create_escrow: "Lock SOL in Escrow",
  approve_work:  "Release Payment to Freelancer",
  cancel_escrow: "Cancel Contract & Recover SOL",
};

const ACTION_DESCRIPTIONS = {
  create_escrow: (amount) => `You are about to lock ${amount} SOL`,
  approve_work:  (amount) => `You are about to release ${amount} SOL to the freelancer`,
  cancel_escrow: (amount) => `You are about to cancel and recover ${amount} SOL`,
};

export default function TransactionConfirmModal({
  action,
  amountSOL,
  counterparty,
  escrowTitle,
  onConfirm,
  onCancel,
}) {
  const { solToUSD } = useSolanaPrice();
  const usdEquiv = solToUSD(amountSOL);

  const title = ACTION_LABELS[action] || "Confirm Action";
  const description = ACTION_DESCRIPTIONS[action]?.(amountSOL) ?? "";

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="txn-confirm-title">
      <div className="modal-box" style={{ maxWidth: 460 }}>
        <button className="modal-close-btn" onClick={onCancel} aria-label="Cancel">
          <X size={18} strokeWidth={2} />
        </button>

        <h2 id="txn-confirm-title" style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1rem" }}>
          {title}
        </h2>

        <div className="txn-amount-box">
          <div className="txn-amount-sol">{amountSOL} SOL</div>
          {usdEquiv && (
            <div className="txn-amount-usd">≈ ${usdEquiv} USD</div>
          )}
        </div>

        <div className="txn-details">
          {escrowTitle && (
            <div className="txn-detail-row">
              <span>Contract</span>
              <span>{escrowTitle}</span>
            </div>
          )}
          {counterparty && (
            <div className="txn-detail-row">
              <span>Counterparty</span>
              <span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                {counterparty.slice(0, 6)}…{counterparty.slice(-4)}
              </span>
            </div>
          )}
          <div className="txn-detail-row">
            <span>Network</span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontWeight: 700, color: "var(--err)" }}>
              ⚡ Solana Mainnet (Real)
            </span>
          </div>
        </div>

        <div className="mainnet-warning-box" style={{ marginBottom: "1.25rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
          <AlertTriangle size={15} strokeWidth={2} style={{ color: "var(--err)", flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: "0.82rem" }}>
            This action is <strong>IRREVERSIBLE</strong>. Phantom will ask for final confirmation.
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn--outline" onClick={onCancel} style={{ flex: 1 }}>
            Cancel
          </button>
          <button className="btn btn--danger" onClick={onConfirm} style={{ flex: 1 }}>
            Confirm & Open Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
