import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchRiderApplication, submitRiderApplication } from "../../api/riders";

const VEHICLE_TYPES = [
  ["bicycle", "Bicycle"],
  ["motorcycle", "Motorcycle"],
  ["car", "Car"],
  ["van", "Van"],
  ["on_foot", "On foot"],
];

export default function RiderApplyPage() {
  const navigate = useNavigate();
  const { data: application, isLoading } = useQuery({
    queryKey: ["rider-application"],
    queryFn: fetchRiderApplication,
  });

  const {
    register: field,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();

  async function onSubmit(values) {
    try {
      await submitRiderApplication(values);
      toast.success("Application submitted! We'll review it shortly.");
      navigate("/rider/status");
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
    navigate("/rider/status", { replace: true });
    return null;
  }

  const inputClass = "w-full bg-transparent border border-paper-line rounded-lg px-3 py-2.5 focus:border-ink outline-none transition-colors";

  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-display text-3xl mb-1">Become a rider</h1>
      <p className="text-ink-soft mb-8">Deliver orders and earn on your own schedule.</p>

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
          <label className="block text-sm text-ink-soft mb-1">Service area</label>
          <input {...field("service_area")} placeholder="e.g. Ikeja and environs" className={inputClass} />
          {errors.service_area && (
            <p className="text-sm text-rust mt-1">{errors.service_area.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm text-ink-soft mb-1">Vehicle type</label>
          <select {...field("vehicle_type")} className={inputClass}>
            {VEHICLE_TYPES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
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
