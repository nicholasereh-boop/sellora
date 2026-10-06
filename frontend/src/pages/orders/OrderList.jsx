import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchOrders } from "../../api/orders";

export default function OrderList() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  if (isLoading) return <p className="text-ink-soft">Loading orders...</p>;

  if (!orders?.length) {
    return (
      <div className="text-center py-24">
        <p className="font-display text-2xl mb-2">No orders yet</p>
        <p className="text-ink-soft mb-6">Your order history will show up here.</p>
        <Link
          to="/products"
          className="inline-block bg-ink text-paper px-6 py-2.5 rounded-full hover:bg-indigo transition-colors"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl mb-8">Order history</h1>
      <div className="divide-y divide-paper-line border-t border-b border-paper-line">
        {orders.map((order) => (
          <Link
            key={order.reference}
            to={`/orders/${order.reference}`}
            className="flex items-center justify-between py-5 hover:opacity-70 transition-opacity"
          >
            <div>
              <p className="font-medium">{order.reference}</p>
              <p className="text-sm text-ink-soft">
                {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg">&#8358;{order.total}</p>
              <p className="text-sm text-ink-soft">{order.status_label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
