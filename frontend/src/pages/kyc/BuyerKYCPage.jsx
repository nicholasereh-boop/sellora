import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchBuyerKYC, submitBuyerKYC } from "../../api/kyc";

// KYC data is sensitive: this page never logs form values or the API
// response (not even in a caught error), and nothing here is written
// to localStorage - React Query's cache is in-memory only.
export default function BuyerKYCPage() {
  const queryClient = useQueryClient();
  const { data: kyc, isLoading } = useQuery({
    queryKey: ["kyc-buyer"],
    queryFn: fetchBuyerKYC,
  });

  const {
    register: field,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    if (kyc) {
      reset({
        full_name: kyc.full_name,
        phone: kyc.phone,
        address_line: kyc.address_line,
        city: kyc.city,
        state: kyc.state,
        country: kyc.country,
      });
    }
  }, [kyc, reset]);

  async function onSubmit(values) {
    try {
      await submitBuyerKYC(values);
      toast.success("Identity details submitted for review.");
      queryClient.invalidateQueries({ queryKey: ["kyc-buyer"] });
    } catch (error) {
      const apiError = error.response?.data?.error;
      if (apiError?.fields) {
        Object.entries(apiError.fields).forEach(([f, messages]) => {
          setError(f, { message: messages[0] });
        });
      } else {
        toast.error(apiError?.message ?? "Could not submit. Please try again.");
      }
    }
  }

  if (isLoading) return <p className="text-ink-soft">Loading...</p>;

  const inputClass = "w-full bg-transparent border border-paper-line rounded-lg px-3 py-2.5 focus:border-ink outline-none transition-colors";

  return (
    <div className="max-w-sm">
      <h1 className="font-display text-3xl mb-2">Identity verification</h1>
      <p className="text-ink-soft mb-6">
        Verifying your identity can raise limits on high-value orders.
      </p>

      {kyc && (
        <div className="mb-6 text-sm px-3 py-2 rounded-lg bg-ink/5 inline-block">
          Status: {kyc.status_label}
          {kyc.rejection_reason && (
            <p className="text-rust mt-1">{kyc.rejection_reason}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {[
          ["full_name", "Full name"],
          ["phone", "Phone"],
          ["address_line", "Address"],
          ["city", "City"],
          ["state", "State"],
          ["country", "Country"],
        ].map(([name, label]) => (
          <div key={name}>
            <label className="block text-sm text-ink-soft mb-1">{label}</label>
            <input {...field(name)} className={inputClass} />
            {errors[name] && <p className="text-sm text-rust mt-1">{errors[name].message}</p>}
          </div>
        ))}

        <button
          disabled={isSubmitting}
          className="w-full bg-ink text-paper py-3 rounded-full hover:bg-indigo transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : kyc ? "Update details" : "Submit for review"}
        </button>
      </form>
    </div>
  );
}
