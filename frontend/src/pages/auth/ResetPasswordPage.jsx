import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { confirmPasswordReset } from "../../api/auth";

// Target of the link in the password-reset email: /reset-password/:uid/:token
export default function ResetPasswordPage() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [invalidLink, setInvalidLink] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldErrors({});
    setBusy(true);
    try {
      await confirmPasswordReset({ uid, token, new_password1: password, new_password2: confirm });
      toast.success("Password updated. Please log in.");
      navigate("/login", { replace: true });
    } catch (error) {
      const apiError = error.response?.data?.error;
      if (apiError?.code === "INVALID_LINK") setInvalidLink(true);
      else if (apiError?.fields) setFieldErrors(apiError.fields);
      else toast.error(apiError?.message ?? "Could not update your password.");
    } finally {
      setBusy(false);
    }
  }

  if (invalidLink) {
    return (
      <div className="max-w-sm mx-auto py-8 text-center">
        <h1 className="font-display text-3xl mb-2">Link not valid</h1>
        <p className="text-ink-soft mb-8">This reset link is invalid or has expired.</p>
        <Link to="/forgot-password" className="text-ink underline">
          Request a new link
        </Link>
      </div>
    );
  }

  const inputClass =
    "w-full bg-transparent border border-paper-line rounded-lg px-3 py-2.5 focus:border-ink outline-none transition-colors";

  return (
    <div className="max-w-sm mx-auto py-8">
      <h1 className="font-display text-3xl mb-1">Choose a new password</h1>
      <p className="text-ink-soft mb-8">Pick something you haven&apos;t used before.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-ink-soft mb-1">New password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          {fieldErrors.new_password1 && <p className="text-sm text-rust mt-1">{fieldErrors.new_password1[0]}</p>}
        </div>
        <div>
          <label className="block text-sm text-ink-soft mb-1">Confirm new password</label>
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
          {fieldErrors.new_password2 && <p className="text-sm text-rust mt-1">{fieldErrors.new_password2[0]}</p>}
        </div>
        <button
          disabled={busy}
          className="w-full bg-ink text-paper py-3 rounded-full hover:bg-indigo transition-colors disabled:opacity-50"
        >
          {busy ? "Saving..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
