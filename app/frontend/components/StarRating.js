import { useState } from "react";
import { Star } from "lucide-react";

const SIZES = { sm: 14, md: 20, lg: 28 };

function DisplayStar({ fraction, px }) {
  if (fraction <= 0) {
    return (
      <span style={{ lineHeight: 0, display: "inline-block" }}>
        <Star size={px} fill="none" strokeWidth={1.5} style={{ color: "var(--line)" }} />
      </span>
    );
  }
  if (fraction >= 1) {
    return (
      <span style={{ lineHeight: 0, display: "inline-block" }}>
        <Star size={px} fill="var(--amber)" strokeWidth={0} style={{ color: "var(--amber)" }} />
      </span>
    );
  }
  // Partial star — yellow filled star clipped to fraction width over empty outline
  return (
    <span style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
      <Star size={px} fill="none" strokeWidth={1.5} style={{ color: "var(--line)" }} />
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: `${fraction * 100}%`,
          overflow: "hidden",
          display: "block",
          lineHeight: 0,
        }}
      >
        <Star size={px} fill="var(--amber)" strokeWidth={0} style={{ color: "var(--amber)" }} />
      </span>
    </span>
  );
}

/**
 * StarRating — display or interactive star rating.
 *
 * Props:
 *   value       {number}   Current rating (0-5). Supports decimals in display mode.
 *   size        {string}   "sm" | "md" | "lg"  (default "md")
 *   interactive {boolean}  Enables click/hover (default false)
 *   onChange    {function} Called with new integer rating when interactive
 */
export default function StarRating({ value = 0, size = "md", interactive = false, onChange }) {
  const [hovered, setHovered] = useState(0);
  const px = SIZES[size] || SIZES.md;

  if (!interactive) {
    return (
      <span
        style={{ display: "inline-flex", alignItems: "center", gap: 1 }}
        aria-label={`${value} out of 5 stars`}
        role="img"
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <DisplayStar
            key={i}
            fraction={Math.max(0, Math.min(1, value - (i - 1)))}
            px={px}
          />
        ))}
      </span>
    );
  }

  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 2 }}
      role="group"
      aria-label="Star rating selector"
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= (hovered || value);
        return (
          <button
            key={i}
            type="button"
            aria-label={`${i} star${i !== 1 ? "s" : ""}`}
            aria-pressed={i === value}
            style={{
              background:  "none",
              border:      "none",
              padding:     "2px",
              cursor:      "pointer",
              lineHeight:  0,
              transition:  "transform 0.1s ease",
              transform:   filled && hovered >= i ? "scale(1.15)" : "scale(1)",
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange && onChange(i)}
          >
            <Star
              size={px}
              fill={filled ? "var(--amber)" : "none"}
              strokeWidth={filled ? 0 : 1.5}
              style={{ color: filled ? "var(--amber)" : "var(--line)" }}
            />
          </button>
        );
      })}
    </span>
  );
}
