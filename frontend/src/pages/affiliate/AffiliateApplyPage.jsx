import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchAffiliateApplication, submitAffiliateApplication } from "../../api/affiliates";

export default function AffiliateApplyPage() {
  const navigate = useNavigate();
  const { data: application, isLoading } = useQuery({
    queryKey: ["affiliate-application"],
    queryFn: fetchAffiliateApplication,
  });

  const {
    register: field,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();

  // Only a REJECTED application reaches this page again (the API allows
  // resubmission in that case) - prefill so the applicant isn't
  // retyping everything.
  useEffect(() => {
    if (application?.status === "rejected") {
      reset({
        full_name: application.full_name,
        phone: application.phone,
        contact_email: application.contact_email,
        promotional_channels: application.promotional_channels,
      });
    }
  }, [application, reset]);

  async function onSubmit(values) {
    try {
      await submitAffiliateApplication(values);
      toast.success("Application submitted! We'll review it shortly.");
      navigate("/affiliate/status");
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
  if (application && application.status !== "rejected") {
    navigate("/affiliate/status", { replace: true });
    return null;
  }

  const inputClass = "w-full bg-transparent border border-paper-line rounded-lg px-3 py-2.5 focus:border-ink outline-none transition-colors";

  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-display text-3xl mb-1">Become an affiliate</h1>
      <p className="text-ink-soft mb-8">Earn commission promoting Sellora products.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm text-ink-soft mb-1">Full name</label>
          <input {...field("full_name")} className={inputClass} />
          {errors.full_name && <p className="text-sm text-rust mt-1">{errors.full_name.message}</p>}
        </div>
        <div>
          <label className="block text-sm text-ink-soft mb-1">Phone</label>
          <input {...field("phone")} className={inputClass} />
          {errors.phone && <p className="text-sm text-rust mt-1">{errors.phone.message}</p>}
        </div>
        <div>
          <label className="block text-sm text-ink-soft mb-1">
            Contact email <span className="text-ink-soft/70">(optional)</span>
          </label>
          <input {...field("contact_email")} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm text-ink-soft mb-1">
            Where will you promote products?
          </label>
          <textarea
            {...field("promotional_channels")}
            rows={3}
            placeholder="Blog, Instagram, YouTube, etc."
            className={inputClass}
          />
          {errors.promotional_channels && (
            <p className="text-sm text-rust mt-1">{errors.promotional_channels.message}</p>
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
