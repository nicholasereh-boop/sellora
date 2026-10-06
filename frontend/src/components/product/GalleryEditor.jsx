import { useEffect, useMemo, useRef } from "react";
import { ImagePlus, X } from "lucide-react";

export const MAX_GALLERY_IMAGES = 8; // + the main image = 9 per product

// Extra-image picker shared by the seller and admin product forms.
// Fully controlled: parent keeps `existing` (gallery_images from the
// API, minus any marked for removal) and `files` (new File objects) and
// sends them on save (see appendGalleryFields).
export default function GalleryEditor({ existing, onRemoveExisting, files, onFilesChange, error }) {
  const inputRef = useRef(null);
  const total = existing.length + files.length;
  const remaining = MAX_GALLERY_IMAGES - total;

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function handlePick(e) {
    const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    onFilesChange([...files, ...picked].slice(0, MAX_GALLERY_IMAGES - existing.length));
    e.target.value = "";
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="dash-label">More images</label>
        <span className="text-xs text-mist-soft">
          {total} / {MAX_GALLERY_IMAGES} &middot; up to {MAX_GALLERY_IMAGES + 1} with the main image
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {existing.map((g) => (
          <Tile key={g.id} src={g.image} onRemove={() => onRemoveExisting(g.id)} />
        ))}
        {previews.map((src, i) => (
          <Tile
            key={src}
            src={src}
            isNew
            onRemove={() => onFilesChange(files.filter((_, idx) => idx !== i))}
          />
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border border-dashed border-surface-line text-mist-soft hover:text-mist hover:border-mist-soft transition-colors flex flex-col items-center justify-center gap-1 text-xs"
          >
            <ImagePlus size={20} strokeWidth={1.5} />
            Add
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handlePick} className="hidden" />
      <p className="text-xs text-mist-soft mt-2">JPG or PNG, up to 5 MB each. You can select several at once.</p>
      {error && <p className="text-sm text-rust mt-1">{error.message}</p>}
    </div>
  );
}

function Tile({ src, onRemove, isNew }) {
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden ring-1 ring-surface-line bg-canvas group">
      <img src={src} alt="" className="w-full h-full object-cover" />
      {isNew && (
        <span className="absolute left-1 bottom-1 rounded bg-marigold text-canvas text-[10px] font-semibold px-1.5 py-0.5">
          New
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove image"
        className="absolute right-1 top-1 h-6 w-6 rounded-full bg-canvas/80 text-mist flex items-center justify-center hover:bg-rust transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// Adds the gallery fields the API expects to a FormData.
export function appendGalleryFields(formData, files, removedIds) {
  files.forEach((f) => formData.append("gallery_images", f));
  formData.append("remove_gallery_ids", JSON.stringify(removedIds));
}
