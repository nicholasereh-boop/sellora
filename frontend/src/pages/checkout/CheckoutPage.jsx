import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchCheckoutSummary, submitCheckout } from "../../api/orders";
import { initiatePayment } from "../../api/payments";
import { useAuth } from "../../contexts/AuthContext";

const schema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(1, "Phone number is required"),
  delivery_method: z.enum(["shipping", "local_delivery"]),
  address_line1: z.string().min(1, "Address is required"),
  address_line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postal_code: z.string().optional(),
  country: z.string().min(1),
});

export default function CheckoutPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deliveryMethod, setDeliveryMethod] = useState("shipping");

  const {
    register: field,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user?.username ?? "",
      email: user?.email ?? "",
      delivery_method: "shipping",
      country: "Nigeria",
    },
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["checkout-summary", deliveryMethod],
    queryFn: () => fetchCheckoutSummary(deliveryMethod),
  });

  async function onSubmit(values) {
    try {
      const { reference } = await submitCheckout(values);
      const { authorization_url, already_paid } = await initiatePayment(reference);
      if (already_paid) {
        navigate(`/orders/${reference}`);
        return;
      }
      window.location.href = authorization_url;
    } catch (error) {
      const apiError = error.response?.data?.error;
      if (apiError?.fields) {
        Object.entries(apiError.fields).forEach(([f, messages]) => {
          setError(f, { message: messages[0] });
        });
      } else {
        toast.error(apiError?.message ?? "Checkout failed. Please try again.");
      }
    }
  }

  const inputClass = "w-full bg-transparent border border-paper-line rounded-lg px-3 py-2.5 focus:border-ink outline-none transition-colors";
  const labelClass = "block text-sm text-ink-soft mb-1";

  return (
    <div className="grid md:grid-cols-3 gap-14">
      <form onSubmit={handleSubmit(onSubmit)} className="md:col-span-2 space-y-5">
        <h1 className="font-display text-3xl mb-2">Checkout</h1>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Full name</label>
            <input {...field("full_name")} className={inputClass} />
            {errors.full_name && <p className="text-sm text-rust mt-1">{errors.full_name.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input {...field("phone")} className={inputClass} />
            {errors.phone && <p className="text-sm text-rust mt-1">{errors.phone.message}</p>}
          </div>
        </div>

        <div>
          <label className={labelClass}>Email</label>
          <input {...field("email")} className={inputClass} />
          {errors.email && <p className="text-sm text-rust mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className={labelClass}>Delivery method</label>
          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="shipping"
                {...field("delivery_method")}
                onChange={(e) => setDeliveryMethod(e.target.value)}
                defaultChecked
              />
              Shipping
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="local_delivery"
                {...field("delivery_method")}
                onChange={(e) => setDeliveryMethod(e.target.value)}
              />
              Local delivery
            </label>
          </div>
        </div>

        <div>
          <label className={labelClass}>Address</label>
          <input {...field("address_line1")} className={inputClass} />
          {errors.address_line1 && (
            <p className="text-sm text-rust mt-1">{errors.address_line1.message}</p>
          )}
        </div>
        <input {...field("address_line2")} placeholder="Address (cont'd)" className={inputClass} />

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>City</label>
            <input {...field("city")} className={inputClass} />
            {errors.city && <p className="text-sm text-rust mt-1">{errors.city.message}</p>}
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input {...field("state")} className={inputClass} />
            {errors.state && <p className="text-sm text-rust mt-1">{errors.state.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Postal code</label>
            <input {...field("postal_code")} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Country</label>
          <input {...field("country")} className={inputClass} />
        </div>

        <button
          disabled={isSubmitting}
          className="w-full bg-ink text-paper py-3 rounded-full hover:bg-indigo transition-colors disabled:opacity-50 mt-2"
        >
          {isSubmitting ? "Redirecting to payment..." : "Pay now"}
        </button>
      </form>

      <aside className="border-t border-paper-line pt-6 h-fit md:border-t-0 md:pt-0 md:pl-8 md:border-l">
        <h2 className="font-medium mb-4">Order summary</h2>
        {summaryLoading && <p className="text-sm text-ink-soft">Calculating...</p>}
        {summary && (
          <>
            {summary.sellers.map((s) => (
              <div key={s.seller_name} className="flex justify-between text-sm text-ink-soft mb-1.5">
                <span>{s.seller_name} ({s.item_count})</span>
                <span>&#8358;{s.subtotal}</span>
              </div>
            ))}
            <div className="border-t border-paper-line mt-4 pt-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-ink-soft">
                <span>Products</span>
                <span>&#8358;{summary.products_total}</span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Delivery</span>
                <span>&#8358;{summary.total_delivery_fee}</span>
              </div>
              <div className="flex justify-between font-display text-lg pt-1">
                <span>Total</span>
                <span>&#8358;{summary.final_total}</span>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
