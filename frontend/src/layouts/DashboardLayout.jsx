import { Link, NavLink, Outlet } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Shared shell for the seller and affiliate portals - the "control room"
 * half of the design system (see index.css's header comment). Storefront
 * pages (PublicLayout) are warm/paper/light; these are dark, dense,
 * numbers-first. One component so both portals stay visually identical
 * as they grow, rather than drifting apart.
 *
 * `light` switches the whole portal to the white theme (seller + rider);
 * admin and affiliate stay on the default dark palette.
 */
export default function DashboardLayout({ title, links, footer, children, light = false }) {
  return (
    <div className={`min-h-screen bg-canvas text-mist flex ${light ? "dash-light" : ""}`}>
      <aside className="w-60 shrink-0 border-r border-surface-line flex flex-col">
        <div className="px-6 py-6 border-b border-surface-line">
          <Link to="/" className="flex items-center gap-2 text-mist-soft hover:text-mist text-sm mb-4 transition-colors">
            <ArrowLeft size={15} />
            Sellora
          </Link>
          <p className="font-display text-lg text-mist">{title}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to.split("/").length <= 2}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-indigo text-white"
                    : "text-mist-soft hover:text-mist hover:bg-surface"
                }`
              }
            >
              {Icon && <Icon size={17} strokeWidth={1.75} />}
              {label}
            </NavLink>
          ))}
        </nav>

        {footer && <div className="px-3 py-4 border-t border-surface-line">{footer}</div>}
      </aside>

      <main className="flex-1 px-10 py-10 max-w-5xl">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
