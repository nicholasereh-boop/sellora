import { Pencil } from "lucide-react";

// Read-only "written document" view for settings and verification pages.
// Once something has been saved, the page shows it like a printed form -
// a title, then labelled lines of plain text - with an Edit button that
// swaps back to the form. Follows the dashboard theme tokens, so it is
// white in the seller/rider portals and dark in the affiliate one.
//
// sections = [{ heading?: string, rows: [{ label, value, wide? }] }]
//   value: string | number | ReactNode. Empty values render "Not provided".
// notice   = optional line under the title (status, rejection reason...)
export default function DocumentView({ title, subtitle, notice, sections, onEdit, editLabel = "Edit", children }) {
  return (
    <article className="dash-card p-8">
      <header className="flex items-start justify-between gap-4 pb-5 border-b border-surface-line">
        <div>
          <h2 className="font-display text-xl text-mist">{title}</h2>
          {subtitle && <p className="text-sm text-mist-soft mt-1">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-surface-line px-3.5 py-1.5 text-sm text-mist hover:border-mist-soft transition-colors"
        >
          <Pencil size={14} />
          {editLabel}
        </button>
      </header>

      {notice && <div className="mt-5 text-sm">{notice}</div>}

      {sections.map((section, i) => (
        <section key={section.heading ?? i} className={i === 0 && !notice ? "mt-6" : "mt-8"}>
          {section.heading && (
            <h3 className="text-xs uppercase tracking-wider text-mist-soft mb-3">{section.heading}</h3>
          )}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            {section.rows.map((row) => {
              const empty = row.value === undefined || row.value === null || row.value === "";
              return (
                <div key={row.label} className={row.wide ? "sm:col-span-2" : undefined}>
                  <dt className="text-xs text-mist-soft mb-0.5">{row.label}</dt>
                  <dd className={`leading-relaxed whitespace-pre-line break-words ${empty ? "text-mist-soft italic" : "text-mist"}`}>
                    {empty ? "Not provided" : row.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}

      {children}
    </article>
  );
}

// Shows only the last four digits of an account number in the document.
export function maskAccount(value) {
  if (!value) return "";
  const s = String(value);
  return s.length <= 4 ? s : `${"•".repeat(Math.min(s.length - 4, 6))}${s.slice(-4)}`;
}

// Cancel button used inside the forms once a document exists.
export function CancelEditButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="dash-btn-ghost w-full mt-2 py-2">
      Cancel
    </button>
  );
}
