import { useState } from "react";
import { Plus, X } from "lucide-react";
import { SIZE_PRESETS, sortSizes } from "./variantUtils";

// Colour + size editing block shared by the seller and admin product
// forms (dashboard/dark styling). Fully controlled: the parent owns
// `colors` ([{name, hex_code}]) and `sizes` (["S", "M", ...]) and
// sends them with the product on save (see buildVariantFields).
export default function VariantEditor({ colors, onColorsChange, sizes, onSizesChange, errors = {} }) {
  const [customSize, setCustomSize] = useState("");

  const customSizes = sizes.filter((s) => !SIZE_PRESETS.includes(s));

  function toggleSize(label) {
    onSizesChange(
      sizes.includes(label) ? sizes.filter((s) => s !== label) : sortSizes([...sizes, label])
    );
  }

  function addCustomSize() {
    const label = customSize.trim().slice(0, 20);
    if (!label) return;
    const exists = sizes.some((s) => s.toLowerCase() === label.toLowerCase());
    if (!exists) onSizesChange(sortSizes([...sizes, label]));
    setCustomSize("");
  }

  function updateColor(i, patch) {
    onColorsChange(colors.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="dash-label">Sizes</label>
        <div className="flex flex-wrap gap-2">
          {SIZE_PRESETS.map((label) => {
            const on = sizes.includes(label);
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleSize(label)}
                aria-pressed={on}
                className={`min-w-[2.75rem] px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  on
                    ? "bg-marigold text-canvas border-marigold"
                    : "border-surface-line text-mist-soft hover:text-mist hover:border-mist-soft"
                }`}
              >
                {label}
              </button>
            );
          })}
          {customSizes.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-lg text-sm font-medium bg-marigold text-canvas"
            >
              {label}
              <button
                type="button"
                onClick={() => toggleSize(label)}
                aria-label={`Remove size ${label}`}
                className="rounded hover:bg-canvas/15 p-0.5"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomSize();
              }
            }}
            placeholder="Other size (e.g. XXL, 42)"
            maxLength={20}
            className="dash-input"
          />
          <button type="button" onClick={addCustomSize} className="dash-btn-ghost whitespace-nowrap px-2">
            Add size
          </button>
        </div>
        {errors.size_variants && <p className="text-sm text-rust mt-1">{errors.size_variants.message}</p>}
      </div>

      <div>
        <label className="dash-label">Colours</label>
        <div className="space-y-2">
          {colors.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={c.hex_code || "#3d3287"}
                onChange={(e) => updateColor(i, { hex_code: e.target.value })}
                aria-label="Pick colour"
                className="h-9 w-11 flex-shrink-0 cursor-pointer rounded-lg border border-surface-line bg-canvas p-1"
              />
              <input
                value={c.name}
                onChange={(e) => updateColor(i, { name: e.target.value })}
                placeholder="Colour name (e.g. Navy)"
                maxLength={50}
                className="dash-input"
              />
              <button
                type="button"
                onClick={() => onColorsChange(colors.filter((_, idx) => idx !== i))}
                aria-label="Remove colour"
                className="text-mist-soft hover:text-rust p-1.5"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onColorsChange([...colors, { name: "", hex_code: "#3d3287" }])}
          className="dash-btn-ghost flex items-center gap-1 mt-3"
        >
          <Plus size={14} />
          Add colour
        </button>
        {errors.color_variants && <p className="text-sm text-rust mt-1">{errors.color_variants.message}</p>}
      </div>
    </div>
  );
}
