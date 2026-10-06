import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchAffiliateBankDetails, updateAffiliateBankDetails } from "../../api/affiliates";
import DocumentView, { CancelEditButton, maskAccount } from "../../components/dashboard/DocumentView";

export default function AffiliateBankDetails() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { data: details, isLoading } = useQuery({
    queryKey: ["affiliate-bank-details"],
    queryFn: fetchAffiliateBankDetails,
  });

  const {
    register: field,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    if (details) reset({ bank_code: details.bank_code, bank_account_number: details.bank_account_number });
  }, [details, reset]);

  async function onSubmit(values) {
    try {
      await updateAffiliateBankDetails(values);
      await queryClient.invalidateQueries({ queryKey: ["affiliate-bank-details"] });
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
            reset({ bank_code: details.bank_code, bank_account_number: details.bank_account_number });
            setEditing(true);
          }}
          sections={[
            {
              rows: [
                { label: "Bank", value: details.bank_name },
                { label: "Bank code", value: details.bank_code },
                { label: "Account number", value: maskAccount(details.bank_account_number) },
              ],
            },
          ]}
        />
      ) : (
      <>
      {details?.bank_name && (
        <p className="text-sm text-mist-soft mb-4">Current bank on file: {details.bank_name}</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="dash-card p-6 space-y-5">
        <div>
          <label className="dash-label">Bank code</label>
          <input {...field("bank_code")} className="dash-input" />
          {errors.bank_code && <p className="text-sm text-rust mt-1">{errors.bank_code.message}</p>}
        </div>
        <div>
          <label className="dash-label">Account number</label>
          <input {...field("bank_account_number")} className="dash-input" />
          {errors.bank_account_number && (
            <p className="text-sm text-rust mt-1">{errors.bank_account_number.message}</p>
          )}
        </div>

        <button disabled={isSubmitting} className="dash-btn-primary w-full">
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
        {details?.bank_account_number && <CancelEditButton onClick={() => setEditing(false)} />}
      </form>
      </>
      )}
    </div>
  );
}
