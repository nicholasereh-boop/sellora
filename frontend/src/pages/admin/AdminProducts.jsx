import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { deleteAdminProduct, fetchAdminProducts } from "../../api/admin";
import ProductImage from "../../components/product/ProductImage";
import StarRating from "../../components/product/StarRating";
import VariantBadges from "../../components/product/VariantBadges";

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const { data: products, isLoading, isError } = useQuery({
    queryKey: ["admin-products"],
    queryFn: fetchAdminProducts,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminProduct,
    onSuccess: () => {
      toast.success("Product deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: () => toast.error("Could not delete product."),
  });

  if (isLoading) return <p className="text-mist-soft">Loading products...</p>;
  if (isError) return <p className="text-rust">Could not load products.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Products</h1>
        <Link to="/admin-panel/products/new" className="dash-btn-primary flex items-center gap-1.5">
          <Plus size={16} />
          Add product
        </Link>
      </div>

      {!products.length && <div className="dash-card p-10 text-center text-mist-soft">No products yet.</div>}

      <div className="dash-card divide-y divide-surface-line">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-4 px-5 py-4">
            <ProductImage src={p.image} tone="dark" className="w-16 h-16" />
            <div className="flex-1 min-w-0">
              <Link
                to={`/admin-panel/products/${p.id}/edit`}
                className="font-medium hover:text-marigold transition-colors truncate block"
              >
                {p.name}
              </Link>
              <p className="text-sm text-mist-soft">
                &#8358;{p.price} &middot; {p.product_type} &middot; {p.stock} in stock
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <span className="flex items-center gap-1.5 text-xs text-mist-soft">
                  {p.review_count > 0 ? (
                    <>
                      <StarRating value={p.average_rating} size={13} tone="dark" />
                      {p.average_rating} ({p.review_count})
                    </>
                  ) : (
                    "No reviews yet"
                  )}
                </span>
                <VariantBadges colors={p.color_variants} sizes={p.size_variants} tone="dark" />
              </div>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                p.is_active ? "bg-moss/20 text-moss" : "bg-surface-line text-mist-soft"
              }`}
            >
              {p.is_active ? "Active" : "Inactive"}
            </span>
            <button
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm(`Delete "${p.name}"? This can't be undone.`)) deleteMutation.mutate(p.id);
              }}
              className="text-sm text-rust hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
