import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchRiderProfile, updateRiderProfile } from "../../api/riders";
import DocumentView, { CancelEditButton, maskAccount } from "../../components/dashboard/DocumentView";

const VEHICLE_TYPES = [
  ["bicycle", "Bicycle"],
  ["motorcycle", "Motorcycle"],
  ["car", "Car"],
  ["van", "Van"],
  ["on_foot", "On foot"],
];

export default function RiderProfile() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { data: profile, isLoading } = useQuery({
    queryKey: ["rider-profile"],
    queryFn: fetchRiderProfile,
  });

  const {
    register: field,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name,
        phone: profile.phone,
        contact_email: profile.contact_email,
        service_area: profile.service_area,
        vehicle_type: profile.vehicle_type,
      });
    }
  }, [profile, reset]);

  async function onSubmit(values) {
    try {
      await updateRiderProfile(values);
      await queryClient.invalidateQueries({ queryKey: ["rider-profile"] });
      toast.success("Profile updated.");
      setEditing(false);
    } catch (error) {
      const apiError = error.response?.data?.error;
      if (apiError?.fields) {
        Object.entries(apiError.fields).forEach(([f, messages]) => {
          setError(f, { message: messages[0] });
        });
      } else {
        toast.error(apiError?.message ?? "Could not update profile.");
      }
    }
  }

  if (isLoading) return <p className="text-mist-soft">Loading...</p>;

  return (
    <div className="max-w-md">
      <h1 className="font-display text-3xl mb-2">Profile</h1>
      <p className="text-sm text-mist-soft mb-8">
        {profile.verified ? "Verified rider" : "Not yet verified"} &middot; {profile.status_label}
      </p>

      {profile?.full_name && !editing ? (
        <DocumentView
          title={profile.full_name}
          subtitle="Rider profile"
          onEdit={() => {
            reset({
              full_name: profile.full_name,
              phone: profile.phone,
              contact_email: profile.contact_email,
              service_area: profile.service_area,
              vehicle_type: profile.vehicle_type,
            });
            setEditing(true);
          }}
          sections={[
            {
              rows: [
                { label: "Full name", value: profile.full_name },
                { label: "Phone", value: profile.phone },
                { label: "Contact email", value: profile.contact_email },
                { label: "Service area", value: profile.service_area },
                { label: "Vehicle type", value: VEHICLE_TYPES.find(([v]) => v === profile.vehicle_type)?.[1] ?? profile.vehicle_type },
              ],
            },
          ]}
        />
      ) : (
      <form onSubmit={handleSubmit(onSubmit)} className="dash-card p-6 space-y-5">
        <div>
          <label className="dash-label">Full name</label>
          <input {...field("full_name")} className="dash-input" />
          {errors.full_name && <p className="text-sm text-rust mt-1">{errors.full_name.message}</p>}
        </div>
        <div>
          <label className="dash-label">Phone</label>
          <input {...field("phone")} className="dash-input" />
          {errors.phone && <p className="text-sm text-rust mt-1">{errors.phone.message}</p>}
        </div>
        <div>
          <label className="dash-label">Contact email</label>
          <input {...field("contact_email")} className="dash-input" />
        </div>
        <div>
          <label className="dash-label">Service area</label>
          <input {...field("service_area")} className="dash-input" />
          {errors.service_area && (
            <p className="text-sm text-rust mt-1">{errors.service_area.message}</p>
          )}
        </div>
        <div>
          <label className="dash-label">Vehicle type</label>
          <select {...field("vehicle_type")} className="dash-input">
            {VEHICLE_TYPES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <button disabled={isSubmitting} className="dash-btn-primary w-full">
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
        {profile?.full_name && <CancelEditButton onClick={() => setEditing(false)} />}
      </form>
      )}
    </div>
  );
}
