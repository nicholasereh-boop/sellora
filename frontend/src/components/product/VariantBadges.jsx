import { sortSizes } from "./variantUtils";

// Compact, read-only summary of a product's colours and sizes for list
// rows/cards: up to `max` colour dots (+N) and the size labels.
export default function VariantBadges({ colors = [], sizes = [], tone = "light", max = 5, className = "" }) {
  if (!colors.length && !sizes.length) return null;

  const text = tone === "dark" ? "text-mist-soft" : "text-ink-soft";
  const ring = tone === "dark" ? "ring-surface-line" : "ring-ink/15";
  const shown = colors.slice(0, max);
  const extra = colors.length - shown.length;
  const labels = sortSizes(sizes.map((s) => s.label));

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${text} ${className}`}>
      {colors.length > 0 && (
        <span className="flex items-center gap-1" title={colors.map((c) => c.name).join(", ")}>
          {shown.map((c) => (
            <span
              key={c.id}
              className={`h-3.5 w-3.5 rounded-full ring-1 ${ring}`}
              style={{ backgroundColor: c.hex_code || "transparent" }}
            />
          ))}
          {extra > 0 && <span className="ml-0.5">+{extra}</span>}
        </span>
      )}
      {labels.length > 0 && <span>{labels.join(" · ")}</span>}
    </div>
  );
}
