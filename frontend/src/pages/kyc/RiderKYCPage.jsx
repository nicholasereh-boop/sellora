import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchRiderKYC, submitRiderKYC } from "../../api/kyc";
import DocumentView, { CancelEditButton } from "../../components/dashboard/DocumentView";

const DOCUMENT_TYPES = [
  ["nin", "National ID Number (NIN)"],
  ["passport", "International Passport"],
  ["drivers_license", "Driver's Licence"],
  ["voters_card", "Voter's Card"],
  ["cac_certificate", "CAC Certificate (Business)"],
];

// KYC data is sensitive: this page never logs form values or the API
// response. id_document_number and drivers_license_number are
// write-only - submitted here, never read back over the API.
export default function RiderKYCPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);

  const { data: kyc, isLoading } = useQuery({
    queryKey: ["kyc-rider"],
    queryFn: fetchRiderKYC,
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
        date_of_birth: kyc.date_of_birth,
        operating_location: kyc.operating_location,
        emergency_contact_name: kyc.emergency_contact_name,
        emergency_contact_phone: kyc.emergency_contact_phone,
        id_document_type: kyc.id_document_type,
        drivers_license_expiry: kyc.drivers_license_expiry,
        vehicle_make: kyc.vehicle_make,
        vehicle_model: kyc.vehicle_model,
        vehicle_color: kyc.vehicle_color,
        plate_number: kyc.plate_number,
      });
    }
  }, [kyc, reset]);

  async function onSubmit(values) {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, value ?? ""));
    if (documentFile) formData.append("id_document_file", documentFile);
    if (licenseFile) formData.append("drivers_license_file", licenseFile);

    try {
      await submitRiderKYC(formData);
      toast.success("KYC details submitted for review.");
      await queryClient.invalidateQueries({ queryKey: ["kyc-rider"] });
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
      <h1 className="font-display text-3xl mb-2">Rider verification</h1>
      <p className="text-sm text-mist-soft mb-6">
        Required before you can accept deliveries.
      </p>

      {kyc && !editing ? (
        <DocumentView
          title="Verification details"
          subtitle="Rider verification"
          editLabel="Update details"
          onEdit={() => {
            reset({
              date_of_birth: kyc.date_of_birth,
              operating_location: kyc.operating_location,
              emergency_contact_name: kyc.emergency_contact_name,
              emergency_contact_phone: kyc.emergency_contact_phone,
              id_document_type: kyc.id_document_type,
              drivers_license_expiry: kyc.drivers_license_expiry,
              vehicle_make: kyc.vehicle_make,
              vehicle_model: kyc.vehicle_model,
              vehicle_color: kyc.vehicle_color,
              plate_number: kyc.plate_number,
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
          sections={[
            {
              heading: "Personal",
              rows: [
                {
                  label: "Date of birth",
                  value: kyc.date_of_birth
                    ? new Date(kyc.date_of_birth).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
                    : "",
                },
                { label: "Operating location", value: kyc.operating_location },
                { label: "Emergency contact", value: kyc.emergency_contact_name },
                { label: "Emergency contact phone", value: kyc.emergency_contact_phone },
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
            {
              heading: "Driver's licence",
              rows: [
                { label: "Licence number", value: "Stored securely (hidden)" },
                {
                  label: "Licence expiry",
                  value: kyc.drivers_license_expiry
                    ? new Date(kyc.drivers_license_expiry).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
                    : "",
                },
                { label: "Licence file", value: kyc.has_drivers_license ? "On file" : "" },
              ],
            },
            {
              heading: "Vehicle",
              rows: [
                { label: "Make", value: kyc.vehicle_make },
                { label: "Model", value: kyc.vehicle_model },
                { label: "Colour", value: kyc.vehicle_color },
                { label: "Plate number", value: kyc.plate_number },
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
          {kyc.has_id_document && <p className="text-mist-soft mt-1">ID document on file.</p>}
          {kyc.has_drivers_license && <p className="text-mist-soft">Driver's licence on file.</p>}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="dash-card p-6 space-y-5">
        <div>
          <label className="dash-label">Date of birth</label>
          <input type="date" {...field("date_of_birth")} className="dash-input" />
          {errors.date_of_birth && (
            <p className="text-sm text-rust mt-1">{errors.date_of_birth.message}</p>
          )}
        </div>
        <div>
          <label className="dash-label">Operating location</label>
          <input {...field("operating_location")} className="dash-input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="dash-label">Emergency contact name</label>
            <input {...field("emergency_contact_name")} className="dash-input" />
          </div>
          <div>
            <label className="dash-label">Emergency contact phone</label>
            <input {...field("emergency_contact_phone")} className="dash-input" />
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

        <div>
          <label className="dash-label">Driver's licence number</label>
          <input {...field("drivers_license_number")} className="dash-input" />
        </div>
        <div>
          <label className="dash-label">Driver's licence expiry</label>
          <input type="date" {...field("drivers_license_expiry")} className="dash-input" />
        </div>
        <div>
          <label className="dash-label">
            Driver's licence {kyc?.has_drivers_license ? "(replace)" : "upload"}
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setLicenseFile(e.target.files?.[0] ?? null)}
            className="text-sm text-mist-soft"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="dash-label">Vehicle make</label>
            <input {...field("vehicle_make")} className="dash-input" />
          </div>
          <div>
            <label className="dash-label">Vehicle model</label>
            <input {...field("vehicle_model")} className="dash-input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="dash-label">Vehicle color</label>
            <input {...field("vehicle_color")} className="dash-input" />
          </div>
          <div>
            <label className="dash-label">Plate number</label>
            <input {...field("plate_number")} className="dash-input" />
          </div>
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
