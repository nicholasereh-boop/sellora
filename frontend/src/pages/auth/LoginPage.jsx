import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { login } from "../../api/auth";
import { useAuth } from "../../contexts/AuthContext";
import GoogleAuthButton from "../../components/common/GoogleAuthButton";

// Client-side validation is UX only - Django's LoginForm remains the
// final authority (roadmap Phase 20).
const schema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refetchUser } = useAuth();

  const {
    register: field,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(values) {
    try {
      await login(values);
      await refetchUser();
      toast.success("Welcome back.");
      navigate(location.state?.from?.pathname ?? "/products", { replace: true });
    } catch (error) {
      const apiError = error.response?.data?.error;
      if (apiError?.fields) {
        Object.entries(apiError.fields).forEach(([field, messages]) => {
          setError(field, { message: messages[0] });
        });
      } else {
        toast.error(apiError?.message ?? "Login failed.");
      }
    }
  }

  return (
    <div className="max-w-sm mx-auto py-8">
      <h1 className="font-display text-3xl mb-1">Welcome back</h1>
      <p className="text-ink-soft mb-8">Log in to your Sellora account.</p>

      <GoogleAuthButton label="Continue with Google" />

      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-paper-line" />
        <span className="text-xs text-ink-soft">or</span>
        <div className="h-px flex-1 bg-paper-line" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm text-ink-soft mb-1">Username</label>
          <input
            {...field("username")}
            className="w-full bg-transparent border border-paper-line rounded-lg px-3 py-2.5 focus:border-ink outline-none transition-colors"
          />
          {errors.username && (
            <p className="text-sm text-rust mt-1">{errors.username.message}</p>
          )}
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label className="block text-sm text-ink-soft mb-1">Password</label>
            <Link to="/forgot-password" className="text-xs text-ink-soft hover:text-ink underline">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            {...field("password")}
            className="w-full bg-transparent border border-paper-line rounded-lg px-3 py-2.5 focus:border-ink outline-none transition-colors"
          />
          {errors.password && (
            <p className="text-sm text-rust mt-1">{errors.password.message}</p>
          )}
        </div>

        <button
          disabled={isSubmitting}
          className="w-full bg-ink text-paper py-3 rounded-full hover:bg-indigo transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="text-sm text-ink-soft mt-6">
        No account?{" "}
        <Link to="/register" className="text-ink underline">
          Register
        </Link>
      </p>
    </div>
  );
}
