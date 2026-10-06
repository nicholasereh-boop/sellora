import { useState } from "react";
import { Star } from "lucide-react";

// Read-only stars, supports fractional values (4.3 fills 86% of the row).
// tone="light" for the storefront, "dark" for the dashboards.
export default function StarRating({ value = 0, size = 16, tone = "light", className = "" }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / 5) * 100));
  const empty = tone === "dark" ? "text-mist/20" : "text-ink/15";
  const stars = Array.from({ length: 5 }, (_, i) => (
    <Star key={i} size={size} strokeWidth={0} fill="currentColor" className="shrink-0" />
  ));

  return (
    <span
      role="img"
      aria-label={`${Number(value).toFixed(1)} out of 5 stars`}
      className={`relative inline-flex ${className}`}
    >
      <span className={`flex ${empty}`}>{stars}</span>
      <span className="absolute inset-y-0 left-0 flex overflow-hidden text-marigold" style={{ width: `${pct}%` }}>
        {stars}
      </span>
    </span>
  );
}

// Clickable 1-5 picker for the review form.
export function StarInput({ value, onChange, size = 28 }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className={`transition-colors ${n <= shown ? "text-marigold" : "text-ink/15"}`}
        >
          <Star size={size} strokeWidth={0} fill="currentColor" />
        </button>
      ))}
    </div>
  );
}
