import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { requestPasswordReset } from "../../api/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (error) {
      toast.error(error.response?.data?.error?.message ?? "Could not send the reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto py-8">
      <h1 className="font-display text-3xl mb-1">Reset your password</h1>

      {sent ? (
        <>
          <p className="text-ink-soft mt-3 mb-8">
            If that email is registered, a reset link is on its way. Check your inbox (and spam folder).
          </p>
          <Link to="/login" className="text-ink underline text-sm">
            Back to log in
          </Link>
        </>
      ) : (
        <>
          <p className="text-ink-soft mb-8">Enter your email and we&apos;ll send you a link to choose a new password.</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-ink-soft mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border border-paper-line rounded-lg px-3 py-2.5 focus:border-ink outline-none transition-colors"
              />
            </div>
            <button
              disabled={busy}
              className="w-full bg-ink text-paper py-3 rounded-full hover:bg-indigo transition-colors disabled:opacity-50"
            >
              {busy ? "Sending..." : "Send reset link"}
            </button>
          </form>
          <p className="text-sm text-ink-soft mt-6">
            <Link to="/login" className="text-ink underline">
              Back to log in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
