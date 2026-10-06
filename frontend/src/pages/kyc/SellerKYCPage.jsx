import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchSellerKYC, submitSellerKYC } from "../../api/kyc";
import DocumentView, { CancelEditButton } from "../../components/dashboard/DocumentView";

const BUSINESS_TYPES = [
  ["individual", "Individual / Sole Proprietor"],
  ["registered_business", "Registered Business"],
  ["company", "Limited Company"],
];

const DOCUMENT_TYPES = [
  ["nin", "National ID Number (NIN)"],
  ["passport", "International Passport"],
  ["drivers_license", "Driver's Licence"],
  ["voters_card", "Voter's Card"],
  ["cac_certificate", "CAC Certificate (Business)"],
];

// KYC data is sensitive: this page never logs form values or the API
// response. id_document_number is write-only - submitted here, never
// read back (the GET response only ever includes has_id_document).
export default function SellerKYCPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);

  const { data: kyc, isLoading } = useQuery({
    queryKey: ["kyc-seller"],
    queryFn: fetchSellerKYC,
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
        business_type: kyc.business_type,
        business_category: kyc.business_category,
        business_address_line: kyc.business_address_line,
        business_city: kyc.business_city,
        business_state: kyc.business_state,
        business_country: kyc.business_country,
        contact_phone: kyc.contact_phone,
        contact_email: kyc.contact_email,
        id_document_type: kyc.id_document_type,
      });
    }
  }, [kyc, reset]);

  async function onSubmit(values) {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, value ?? ""));
    if (documentFile) formData.append("id_document_file", documentFile);

    try {
      await submitSellerKYC(formData);
      toast.success("KYC details submitted for review.");
      await queryClient.invalidateQueries({ queryKey: ["kyc-seller"] });
      setEditing(false);
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

  if (isLoading) return <p className="text-mist-soft">Loading...</p>;

  return (
    <div className="max-w-md">
      <h1 className="font-display text-3xl mb-2">Seller verification</h1>
      <p className="text-sm text-mist-soft mb-6">
        Required before payouts can be released to your account.
      </p>

      {kyc && !editing ? (
        <DocumentView
          title="Verification details"
          subtitle="Business verification"
          onEdit={() => {
            reset({
              business_type: kyc.business_type,
              business_category: kyc.business_category,
              business_address_line: kyc.business_address_line,
              business_city: kyc.business_city,
              business_state: kyc.business_state,
              business_country: kyc.business_country,
              contact_phone: kyc.contact_phone,
              contact_email: kyc.contact_email,
              id_document_type: kyc.id_document_type,
            });
            setEditing(true);
          }}
          notice={
            <>
              <p>
                Status: <span className="font-medium">{kyc.status_label}</span>
              </p>
              {kyc.rejection_reason && <p className="text-rust mt-1">{kyc.rejection_reason}</p>}
            </>
          }
          editLabel="Update details"
          sections={[
            {
              heading: "Business",
              rows: [
                { label: "Business type", value: BUSINESS_TYPES.find(([v]) => v === kyc.business_type)?.[1] ?? kyc.business_type },
                { label: "Business category", value: kyc.business_category },
                { label: "Address", value: [kyc.business_address_line, kyc.business_city, kyc.business_state, kyc.business_country].filter(Boolean).join(", "), wide: true },
              ],
            },
            {
              heading: "Contact",
              rows: [
                { label: "Phone", value: kyc.contact_phone },
                { label: "Email", value: kyc.contact_email },
              ],
            },
            {
              heading: "Identity document",
              rows: [
                { label: "ID document type", value: DOCUMENT_TYPES.find(([v]) => v === kyc.id_document_type)?.[1] ?? kyc.id_document_type },
                { label: "ID document number", value: "Stored securely (hidden)" },
                { label: "ID document file", value: kyc.has_id_document ? "On file" : "" },
              ],
            },
          ]}
        />
      ) : (
      <>
      {kyc && (
        <div className="dash-card p-4 mb-6 text-sm">
          Status: {kyc.status_label}
          {kyc.rejection_reason && <p className="text-rust mt-1">{kyc.rejection_reason}</p>}
          {kyc.has_id_document && <p className="text-mist-soft mt-1">Document on file.</p>}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="dash-card p-6 space-y-5">
        <div>
          <label className="dash-label">Business type</label>
          <select {...field("business_type")} className="dash-input">
            {BUSINESS_TYPES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="dash-label">Business category</label>
          <input {...field("business_category")} className="dash-input" />
          {errors.business_category && (
            <p className="text-sm text-rust mt-1">{errors.business_category.message}</p>
          )}
        </div>
        <div>
          <label className="dash-label">Business address</label>
          <input {...field("business_address_line")} className="dash-input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="dash-label">City</label>
            <input {...field("business_city")} className="dash-input" />
          </div>
          <div>
            <label className="dash-label">State</label>
            <input {...field("business_state")} className="dash-input" />
          </div>
        </div>
        <div>
          <label className="dash-label">Country</label>
          <input {...field("business_country")} className="dash-input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="dash-label">Contact phone</label>
            <input {...field("contact_phone")} className="dash-input" />
          </div>
          <div>
            <label className="dash-label">Contact email</label>
            <input {...field("contact_email")} className="dash-input" />
          </div>
        </div>

        <div>
          <label className="dash-label">ID document type</label>
          <select {...field("id_document_type")} className="dash-input">
            {DOCUMENT_TYPES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="dash-label">ID document number</label>
          <input {...field("id_document_number")} className="dash-input" />
          {errors.id_document_number && (
            <p className="text-sm text-rust mt-1">{errors.id_document_number.message}</p>
          )}
        </div>
        <div>
          <label className="dash-label">
            ID document {kyc?.has_id_document ? "(replace)" : "upload"}
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
            className="text-sm text-mist-soft"
          />
        </div>

        <button disabled={isSubmitting} className="dash-btn-primary w-full">
          {isSubmitting ? "Submitting..." : kyc ? "Update details" : "Submit for review"}
        </button>
        {kyc && <CancelEditButton onClick={() => setEditing(false)} />}
      </form>
      </>
      )}
    </div>
  );
}
