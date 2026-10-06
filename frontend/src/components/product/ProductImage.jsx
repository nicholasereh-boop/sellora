import { useState } from "react";
import { ImageOff } from "lucide-react";

// One consistent frame for every product thumbnail/card image: soft
// rounded corners, a hairline ring, a tinted placeholder (instead of an
// empty grey box) when there's no image or it fails to load.
// `className` sizes it (e.g. "w-16 h-16" or "aspect-[4/5] mb-3").
// zoom=true adds the slow hover-zoom used on storefront cards (parent
// must have the `group` class).
export default function ProductImage({ src, alt = "", className = "", tone = "light", zoom = false }) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  const frame =
    tone === "dark"
      ? "bg-canvas ring-1 ring-surface-line text-mist-soft"
      : "bg-gradient-to-br from-paper-line/70 to-paper-line/20 ring-1 ring-ink/10 text-ink-soft/60";

  return (
    <div className={`relative overflow-hidden rounded-xl flex-shrink-0 ${frame} ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={`w-full h-full object-cover ${
            zoom ? "transition-transform duration-500 ease-out group-hover:scale-[1.05]" : ""
          }`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageOff size={20} strokeWidth={1.5} />
        </div>
      )}
      {showImage && zoom && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}
    </div>
  );
}
