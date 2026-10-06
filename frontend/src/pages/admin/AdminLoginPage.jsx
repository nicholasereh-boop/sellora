import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminLogin } from "../../api/admin";

// Staff sign-in only. There is intentionally no staff sign-up page: the
// legacy custom_signup let anyone create an is_staff account, so staff
// accounts are created by a superuser instead (see PROGRESS.md).
export default function AdminLoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  async function onSubmit(values) {
    try {
      await adminLogin(values);
      await queryClient.invalidateQueries({ queryKey: ["admin-me"] });
      // The session is shared with the storefront, so refresh who the
      // customer-side app thinks is logged in too.
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate("/admin-panel/dashboard", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error?.message ?? "Login failed.");
    }
  }

  const inputClass =
    "w-full bg-transparent border border-paper-line rounded-lg px-3 py-2.5 focus:border-ink outline-none transition-colors";

  return (
    <div className="max-w-sm mx-auto py-8">
      <h1 className="font-display text-3xl mb-1">Admin sign in</h1>
      <p className="text-ink-soft mb-8">Staff accounts only.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm text-ink-soft mb-1">Username</label>
          <input {...field("username", { required: "Username is required" })} className={inputClass} />
          {errors.username && <p className="text-sm text-rust mt-1">{errors.username.message}</p>}
        </div>
        <div>
          <label className="block text-sm text-ink-soft mb-1">Password</label>
          <input
            type="password"
            {...field("password", { required: "Password is required" })}
            className={inputClass}
          />
          {errors.password && <p className="text-sm text-rust mt-1">{errors.password.message}</p>}
        </div>
        <button
          disabled={isSubmitting}
          className="w-full bg-ink text-paper py-3 rounded-full hover:bg-indigo transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
