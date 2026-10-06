import { Link, Outlet } from "react-router-dom";
import { ShoppingBag, User, Bell } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../hooks/useCart";
import { useUnreadCount } from "../hooks/useNotifications";

export default function PublicLayout() {
  const { user, isAuthenticated } = useAuth();
  const { cart } = useCart();
  const unreadCount = useUnreadCount();

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <header className="border-b border-paper-line">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-2xl font-semibold tracking-tight">
            Sellora
          </Link>

          <nav className="flex items-center gap-7 text-sm text-ink-soft">
            <Link to="/products" className="hover:text-ink transition-colors">
              Shop
            </Link>
            {isAuthenticated && (
              <Link to="/sell/apply" className="hover:text-ink transition-colors">
                Sell
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/affiliate/apply" className="hover:text-ink transition-colors">
                Promote
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/rider/apply" className="hover:text-ink transition-colors">
                Ride
              </Link>
            )}
            <Link to="/cart" className="relative flex items-center hover:text-ink transition-colors">
              <ShoppingBag size={19} strokeWidth={1.75} />
              {cart?.total_items > 0 && (
                <span className="absolute -top-2 -right-2 bg-marigold text-ink text-[11px] font-semibold rounded-full w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {cart.total_items}
                </span>
              )}
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/orders" className="hover:text-ink transition-colors">
                  Orders
                </Link>
                <Link to="/notifications" className="relative flex items-center hover:text-ink transition-colors">
                  <Bell size={19} strokeWidth={1.75} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-rust text-white text-[11px] font-semibold rounded-full w-[18px] h-[18px] px-1 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link to="/account" className="flex items-center gap-1.5 hover:text-ink transition-colors">
                  <User size={19} strokeWidth={1.75} />
                  <span className="text-ink">{user?.username}</span>
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-ink text-paper px-4 py-1.5 rounded-full hover:bg-indigo transition-colors"
              >
                Log in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        <Outlet />
      </main>

      <footer className="border-t border-paper-line py-8 px-6 text-sm text-ink-soft">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="font-display text-lg text-ink">Sellora</span>
          <span>A marketplace for independent sellers.</span>
        </div>
      </footer>
    </div>
  );
}
