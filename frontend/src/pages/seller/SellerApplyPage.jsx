import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchApplication, submitApplication } from "../../api/sellers";

export default function SellerApplyPage() {
  const navigate = useNavigate();
  const { data: application, isLoading } = useQuery({
    queryKey: ["seller-application"],
    queryFn: fetchApplication,
  });

  const {
    register: field,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();

  async function onSubmit(values) {
    try {
      await submitApplication(values);
      toast.success("Application submitted! We'll review it shortly.");
      navigate("/sell/status");
    } catch (error) {
      const apiError = error.response?.data?.error;
      if (apiError?.fields) {
        Object.entries(apiError.fields).forEach(([f, messages]) => {
          setError(f, { message: messages[0] });
        });
      } else {
        toast.error(apiError?.message ?? "Could not submit application.");
      }
    }
  }

  if (isLoading) return null;
  if (application) {
    navigate("/sell/status", { replace: true });
    return null;
  }

  const inputClass = "w-full bg-transparent border border-paper-line rounded-lg px-3 py-2.5 focus:border-ink outline-none transition-colors";

  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-display text-3xl mb-1">Become a seller</h1>
      <p className="text-ink-soft mb-8">Open your own store on Sellora.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm text-ink-soft mb-1">Store name</label>
          <input {...field("store_name")} className={inputClass} />
          {errors.store_name && <p className="text-sm text-rust mt-1">{errors.store_name.message}</p>}
        </div>
        <div>
          <label className="block text-sm text-ink-soft mb-1">Store description</label>
          <textarea {...field("store_description")} rows={3} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm text-ink-soft mb-1">Phone</label>
          <input {...field("phone")} className={inputClass} />
          {errors.phone && <p className="text-sm text-rust mt-1">{errors.phone.message}</p>}
        </div>
        <div>
          <label className="block text-sm text-ink-soft mb-1">Business email</label>
          <input {...field("business_email")} className={inputClass} />
          {errors.business_email && (
            <p className="text-sm text-rust mt-1">{errors.business_email.message}</p>
          )}
        </div>

        <button
          disabled={isSubmitting}
          className="w-full bg-ink text-paper py-3 rounded-full hover:bg-indigo transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Submit application"}
        </button>
      </form>
    </div>
  );
}
