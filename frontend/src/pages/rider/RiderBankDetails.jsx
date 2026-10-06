import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchRiderBankDetails, updateRiderBankDetails } from "../../api/riders";
import DocumentView, { CancelEditButton, maskAccount } from "../../components/dashboard/DocumentView";

export default function RiderBankDetails() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { data: details, isLoading } = useQuery({
    queryKey: ["rider-bank-details"],
    queryFn: fetchRiderBankDetails,
  });

  const {
    register: field,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    if (details) reset(details);
  }, [details, reset]);

  async function onSubmit(values) {
    try {
      await updateRiderBankDetails(values);
      await queryClient.invalidateQueries({ queryKey: ["rider-bank-details"] });
      toast.success("Bank details updated.");
      setEditing(false);
    } catch (error) {
      const apiError = error.response?.data?.error;
      if (apiError?.fields) {
        Object.entries(apiError.fields).forEach(([f, messages]) => {
          setError(f, { message: messages[0] });
        });
      } else {
        toast.error(apiError?.message ?? "Could not update bank details.");
      }
    }
  }

  if (isLoading) return <p className="text-mist-soft">Loading...</p>;

  return (
    <div className="max-w-md">
      <h1 className="font-display text-3xl mb-2">Bank details</h1>
      <p className="text-sm text-mist-soft mb-8">Used for payouts of your available balance.</p>

      {details?.bank_account_number && !editing ? (
        <DocumentView
          title="Payout account"
          onEdit={() => {
            reset(details);
            setEditing(true);
          }}
          sections={[
            {
              rows: [
                { label: "Bank name", value: details.bank_name },
                { label: "Bank code", value: details.bank_code },
                { label: "Account number", value: maskAccount(details.bank_account_number) },
                { label: "Account name", value: details.bank_account_name },
              ],
            },
          ]}
        />
      ) : (
      <form onSubmit={handleSubmit(onSubmit)} className="dash-card p-6 space-y-5">
        <div>
          <label className="dash-label">Bank code</label>
          <input {...field("bank_code")} className="dash-input" />
        </div>
        <div>
          <label className="dash-label">Bank name</label>
          <input {...field("bank_name")} className="dash-input" />
          {errors.bank_name && <p className="text-sm text-rust mt-1">{errors.bank_name.message}</p>}
        </div>
        <div>
          <label className="dash-label">Account number</label>
          <input {...field("bank_account_number")} className="dash-input" />
          {errors.bank_account_number && (
            <p className="text-sm text-rust mt-1">{errors.bank_account_number.message}</p>
          )}
        </div>
        <div>
          <label className="dash-label">Account name</label>
          <input {...field("bank_account_name")} className="dash-input" />
          {errors.bank_account_name && (
            <p className="text-sm text-rust mt-1">{errors.bank_account_name.message}</p>
          )}
        </div>

        <button disabled={isSubmitting} className="dash-btn-primary w-full">
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
        {details?.bank_account_number && <CancelEditButton onClick={() => setEditing(false)} />}
      </form>
      )}
    </div>
  );
}
