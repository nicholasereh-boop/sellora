import { Link, useParams, useSearchParams } from "react-router-dom";

// Where Django's /payments/callback/ sends the buyer after Paystack:
//   /payment/result/:reference?status=success|failed
// The status in the URL is only for the headline - the order page shows
// the real, server-held state (and keeps polling until it's confirmed).
export default function PaymentResultPage() {
  const { reference } = useParams();
  const [searchParams] = useSearchParams();
  const success = searchParams.get("status") === "success";

  return (
    <div className="max-w-md mx-auto py-12 text-center">
      <h1 className="font-display text-3xl mb-2">{success ? "Payment received" : "Payment didn't go through"}</h1>
      <p className="text-ink-soft mb-8">
        {success
          ? `Thank you! Order ${reference} is being processed - we'll keep you posted.`
          : `We couldn't complete the payment for order ${reference}. You haven't been charged for it, and you can try again from the order page.`}
      </p>
      <div className="flex justify-center gap-3">
        <Link
          to={`/orders/${reference}`}
          className="bg-ink text-paper px-6 py-3 rounded-full hover:bg-indigo transition-colors"
        >
          View order
        </Link>
        <Link to="/products" className="px-6 py-3 rounded-full ring-1 ring-ink/20 hover:ring-ink transition">
          Keep shopping
        </Link>
      </div>
    </div>
  );
}
