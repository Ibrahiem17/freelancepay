import { useState } from "react";
import useSolPrice from "@/hooks/useSolPrice";

/**
 * Dual SOL/USD amount input.
 * Props:
 *   value      — current SOL value string (controlled by parent)
 *   onChange   — called with the new SOL value string whenever either input changes
 *   required   — passed to the underlying input
 *   id         — optional id for the input element
 */
export default function SolUsdInput({ value, onChange, required, id }) {
  const solPrice   = useSolPrice();
  const [mode, setMode] = useState("sol"); // "sol" | "usd"
  const [usdInput, setUsdInput] = useState("");

  function handleSolChange(e) {
    const sol = e.target.value;
    onChange(sol);
    if (solPrice && sol && !isNaN(parseFloat(sol))) {
      setUsdInput((parseFloat(sol) * solPrice).toFixed(2));
    } else {
      setUsdInput("");
    }
  }

  function handleUsdChange(e) {
    const usd = e.target.value;
    setUsdInput(usd);
    if (solPrice && usd && !isNaN(parseFloat(usd))) {
      onChange((parseFloat(usd) / solPrice).toFixed(6).replace(/\.?0+$/, ""));
    } else {
      onChange("");
    }
  }

  const solNum = parseFloat(value);
  const usdNum = parseFloat(usdInput);

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: "inline-flex", borderRadius: "var(--r-sm)", border: "2px solid var(--line)", overflow: "hidden", marginBottom: "0.55rem" }}>
        <button
          type="button"
          onClick={() => setMode("sol")}
          style={{
            padding: "4px 14px",
            fontSize: "0.78rem",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            background: mode === "sol" ? "var(--purple)" : "transparent",
            color:      mode === "sol" ? "#fff"         : "var(--ink-soft)",
            transition: "background 0.15s",
          }}
        >
          SOL
        </button>
        <button
          type="button"
          onClick={() => setMode("usd")}
          style={{
            padding: "4px 14px",
            fontSize: "0.78rem",
            fontWeight: 700,
            border: "none",
            borderLeft: "2px solid var(--line)",
            cursor: "pointer",
            background: mode === "usd" ? "var(--purple)" : "transparent",
            color:      mode === "usd" ? "#fff"         : "var(--ink-soft)",
            transition: "background 0.15s",
          }}
        >
          USD
        </button>
      </div>

      {mode === "sol" ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              id={id}
              className="form-input"
              type="number"
              step="0.001"
              min="0.001"
              value={value}
              onChange={handleSolChange}
              placeholder="e.g. 0.5"
              required={required}
              style={{ maxWidth: 180 }}
            />
            <span style={{ fontWeight: 700, color: "var(--ink-soft)", fontSize: "0.88rem" }}>SOL</span>
          </div>
          {solPrice && !isNaN(solNum) && solNum > 0 && (
            <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600, marginTop: "0.3rem" }}>
              ≈ <strong style={{ color: "var(--ink)" }}>${(solNum * solPrice).toFixed(2)} USD</strong>
              &nbsp;·&nbsp; 1 SOL = ${solPrice.toLocaleString()} USD
            </div>
          )}
          {!solPrice && (
            <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)", fontWeight: 600, marginTop: "0.3rem" }}>
              Fetching SOL price…
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontWeight: 700, color: "var(--ink-soft)", fontSize: "0.88rem" }}>$</span>
            <input
              className="form-input"
              type="number"
              step="0.01"
              min="0.01"
              value={usdInput}
              onChange={handleUsdChange}
              placeholder="e.g. 50.00"
              required={required && !value}
              style={{ maxWidth: 180 }}
            />
            <span style={{ fontWeight: 700, color: "var(--ink-soft)", fontSize: "0.88rem" }}>USD</span>
          </div>
          {solPrice && !isNaN(usdNum) && usdNum > 0 ? (
            <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600, marginTop: "0.3rem" }}>
              = <strong style={{ color: "var(--ink)" }}>{(usdNum / solPrice).toFixed(4)} SOL</strong>
              &nbsp;· that&apos;s what will be locked in escrow
            </div>
          ) : !solPrice ? (
            <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)", fontWeight: 600, marginTop: "0.3rem" }}>
              Fetching SOL price…
            </div>
          ) : null}
          {/* Hidden input carries the SOL value for form validation */}
          <input type="hidden" value={value} required={required} />
        </div>
      )}
    </div>
  );
}
