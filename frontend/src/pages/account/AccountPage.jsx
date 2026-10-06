import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { logout } from "../../api/auth";
import { useAuth } from "../../contexts/AuthContext";

export default function AccountPage() {
  const { user, clearUser } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      clearUser();
      toast.success("Logged out.");
      navigate("/");
    } catch {
      toast.error("Could not log out. Try again.");
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-sm">
      <h1 className="font-display text-3xl mb-8">My account</h1>

      <dl className="text-sm divide-y divide-paper-line border-t border-b border-paper-line">
        <div className="flex justify-between py-3">
          <dt className="text-ink-soft">Username</dt>
          <dd>{user.username}</dd>
        </div>
        <div className="flex justify-between py-3">
          <dt className="text-ink-soft">Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div className="flex justify-between py-3">
          <dt className="text-ink-soft">Role</dt>
          <dd className="capitalize">{user.role}</dd>
        </div>
      </dl>

      <div className="mt-6 flex items-center gap-5 text-sm">
        <Link to="/account/profile" className="text-ink underline">
          Edit profile
        </Link>
        <Link to="/kyc/buyer" className="text-ink underline">
          Identity verification
        </Link>
        <button onClick={handleLogout} className="text-rust hover:underline">
          Log out
        </button>
      </div>
    </div>
  );
}
