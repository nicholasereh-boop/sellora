import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

// Product detail gallery: one large framed image (hover to zoom on
// desktop, arrows to flip) with a thumbnail strip underneath.
// images = [{ src, alt }]
export default function ProductGallery({ images }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState({ on: false, x: 50, y: 50 });

  const current = images[Math.min(index, images.length - 1)];
  const many = images.length > 1;

  function step(delta) {
    setIndex((i) => (i + delta + images.length) % images.length);
  }

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoom({
      on: true,
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <div>
      <div
        onMouseMove={handleMove}
        onMouseLeave={() => setZoom((z) => ({ ...z, on: false }))}
        className="group relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-paper-line/70 to-paper-line/20 ring-1 ring-ink/10 shadow-[0_24px_48px_-28px_rgba(25,21,16,0.45)] md:cursor-zoom-in"
      >
        {current ? (
          <img
            src={current.src}
            alt={current.alt}
            style={{ transformOrigin: `${zoom.x}% ${zoom.y}%` }}
            className={`w-full h-full object-cover transition-transform duration-300 ease-out ${
              zoom.on ? "md:scale-[1.8]" : "scale-100"
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-soft/50">
            <ImageOff size={40} strokeWidth={1.25} />
          </div>
        )}

        {many && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-paper/90 text-ink shadow flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-paper/90 text-ink shadow flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            >
              <ChevronRight size={18} />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 text-paper text-xs px-2.5 py-1">
              {Math.min(index, images.length - 1) + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {many && (
        <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={`${img.src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === index}
              className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl transition ${
                i === index
                  ? "ring-2 ring-ink"
                  : "ring-1 ring-ink/10 opacity-70 hover:opacity-100"
              }`}
            >
              <img src={img.src} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
