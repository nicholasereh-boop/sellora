// Shown only the moment a lazy-loaded section's JS chunk is still being
// fetched (its own bundle, not the whole app) - see the "code-split
// bundle" note in docs/react-migration/PROGRESS.md. Deliberately plain:
// this can appear inside either the light storefront or a dark
// dashboard shell, so it avoids committing to either palette.
export default function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-current opacity-60">
      Loading...
    </div>
  );
}
