import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { register as registerUser } from "../../api/auth";
import GoogleAuthButton from "../../components/common/GoogleAuthButton";

// Mirrors apps/accounts/forms.RegisterForm's required fields. Password
// match/strength is still re-checked by Django - this is UX only.
const schema = z
  .object({
    username: z.string().min(1, "Username is required"),
    email: z.string().email("Enter a valid email"),
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Surname is required"),
    phone: z.string().min(1, "Phone number is required"),
    password1: z.string().min(8, "Password must be at least 8 characters"),
    password2: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password1 === data.password2, {
    message: "Passwords don't match",
    path: ["password2"],
  });

export default function RegisterPage() {
  const navigate = useNavigate();
  const {
    register: field,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(values) {
    try {
      const data = await registerUser(values);
      toast.success(data.message ?? "Account created. Check your email.");
      navigate("/login");
    } catch (error) {
      const apiError = error.response?.data?.error;
      if (apiError?.fields) {
        Object.entries(apiError.fields).forEach(([field, messages]) => {
          setError(field, { message: messages[0] });
        });
      } else {
        toast.error(apiError?.message ?? "Registration failed.");
      }
    }
  }

  const inputClass = "w-full bg-transparent border border-paper-line rounded-lg px-3 py-2.5 focus:border-ink outline-none transition-colors";

  return (
    <div className="max-w-sm mx-auto py-8">
      <h1 className="font-display text-3xl mb-1">Create an account</h1>
      <p className="text-ink-soft mb-8">Join Sellora to shop, sell, or promote.</p>

      <GoogleAuthButton label="Sign up with Google" />

      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-paper-line" />
        <span className="text-xs text-ink-soft">or</span>
        <div className="h-px flex-1 bg-paper-line" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {[
          ["username", "Username", "text"],
          ["email", "Email", "email"],
          ["first_name", "First name", "text"],
          ["last_name", "Surname", "text"],
          ["phone", "Phone number", "text"],
          ["password1", "Password", "password"],
          ["password2", "Confirm password", "password"],
        ].map(([name, label, type]) => (
          <div key={name}>
            <label className="block text-sm text-ink-soft mb-1">{label}</label>
            <input type={type} {...field(name)} className={inputClass} />
            {errors[name] && (
              <p className="text-sm text-rust mt-1">{errors[name].message}</p>
            )}
          </div>
        ))}

        <button
          disabled={isSubmitting}
          className="w-full bg-ink text-paper py-3 rounded-full hover:bg-indigo transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-sm text-ink-soft mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-ink underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
