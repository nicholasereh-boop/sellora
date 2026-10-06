import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useCart } from "../../hooks/useCart";

export default function CartPage() {
  const { cart, isLoading, updateItem, removeItem } = useCart();

  if (isLoading) return <p className="text-ink-soft">Loading cart...</p>;

  if (!cart?.items?.length) {
    return (
      <div className="text-center py-24">
        <p className="font-display text-2xl mb-2">Your cart is empty</p>
        <p className="text-ink-soft mb-6">Nothing here yet.</p>
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
      <h1 className="font-display text-3xl mb-8">Your cart</h1>

      <div className="divide-y divide-paper-line border-t border-b border-paper-line">
        {cart.items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 py-5">
            <div className="w-16 h-16 bg-ink/5 overflow-hidden flex-shrink-0">
              {item.image_url && (
                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <Link to={`/products/${item.product_slug}`} className="font-medium hover:text-indigo transition-colors">
                {item.product_name}
              </Link>
              <p className="text-sm text-ink-soft">&#8358;{item.unit_price} each</p>
            </div>

            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => updateItem(item.id, Math.max(1, Number(e.target.value)))}
              className="w-16 bg-transparent border border-paper-line rounded-lg px-2 py-1.5 text-center outline-none focus:border-ink transition-colors"
            />

            <p className="w-24 text-right font-medium">&#8358;{item.subtotal}</p>

            <button
              onClick={() => removeItem(item.id)}
              className="text-ink-soft hover:text-rust transition-colors"
              aria-label="Remove item"
            >
              <X size={17} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-6">
        <p className="text-ink-soft">Total ({cart.total_items} items)</p>
        <p className="font-display text-2xl">&#8358;{cart.total_price}</p>
      </div>

      <div className="flex justify-end mt-6">
        <Link
          to="/checkout"
          className="bg-ink text-paper px-8 py-2.5 rounded-full hover:bg-indigo transition-colors"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
