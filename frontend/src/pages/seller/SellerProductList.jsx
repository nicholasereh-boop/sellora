import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  deleteSellerProduct,
  fetchSellerProducts,
  toggleProductActive,
  updateProductStock,
} from "../../api/sellers";
import ProductImage from "../../components/product/ProductImage";
import StarRating from "../../components/product/StarRating";
import VariantBadges from "../../components/product/VariantBadges";

const POLL_MS = 15000;

export default function SellerProductList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  // While the seller is typing a stock number we pause the live refresh so
  // the field isn't reset underneath them.
  const [typingStock, setTypingStock] = useState(false);

  const queryKey = ["seller-products", page];

  // The list is kept live: it re-fetches every 15 seconds (and when the tab
  // regains focus), so stock changes from sales, status changes and edits
  // made elsewhere show up without a page reload.
  const { data, isLoading, isFetching, isError, dataUpdatedAt, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchSellerProducts(page),
    placeholderData: keepPreviousData,
    refetchInterval: typingStock ? false : POLL_MS,
    refetchOnWindowFocus: true,
  });

  // Instant (optimistic) cache edit: the UI updates immediately, the request
  // runs in the background, and onError puts the old data back.
  function patchCache(updater) {
    queryClient.setQueryData(queryKey, (old) => (old ? updater(old) : old));
  }

  async function optimistic(updater) {
    await queryClient.cancelQueries({ queryKey: ["seller-products"] });
    const previous = queryClient.getQueryData(queryKey);
    patchCache(updater);
    return { previous };
  }

  function rollback(context) {
    if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
  }

  const settle = () => queryClient.invalidateQueries({ queryKey: ["seller-products"] });

  const toggleMutation = useMutation({
    mutationFn: toggleProductActive,
    onMutate: (id) =>
      optimistic((old) => ({
        ...old,
        results: old.results.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p)),
      })),
    onError: (_e, _id, context) => {
      rollback(context);
      toast.error("Could not change the product status.");
    },
    onSettled: settle,
  });

  const stockMutation = useMutation({
    mutationFn: ({ id, stock }) => updateProductStock(id, stock),
    onMutate: ({ id, stock }) =>
      optimistic((old) => ({
        ...old,
        results: old.results.map((p) => (p.id === id ? { ...p, stock } : p)),
      })),
    onSuccess: () => toast.success("Stock updated."),
    onError: (_e, _vars, context) => {
      rollback(context);
      toast.error("Stock must be a whole number of 0 or more.");
    },
    onSettled: settle,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSellerProduct,
    onMutate: (id) =>
      optimistic((old) => ({
        ...old,
        count: Math.max(0, old.count - 1),
        results: old.results.filter((p) => p.id !== id),
      })),
    onSuccess: () => toast.success("Product deleted."),
    onError: (_e, _id, context) => {
      rollback(context);
      toast.error("Could not delete the product. It has been restored.");
    },
    onSettled: settle,
  });

  if (isLoading) return <GridSkeleton />;

  if (isError && !data) {
    return (
      <div className="dash-card p-10 text-center">
        <p className="text-mist-soft mb-4">We couldn't load your products.</p>
        <button onClick={() => refetch()} className="dash-btn-primary">
          Try again
        </button>
      </div>
    );
  }

  const products = data.results;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <h1 className="font-display text-3xl">Products</h1>
        <Link to="/seller/products/new" className="dash-btn-primary flex items-center gap-1.5">
          <Plus size={16} />
          Add product
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-8 text-xs text-mist-soft">
        <span>
          {data.count} product{data.count === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-1.5" title="This list refreshes itself every few seconds">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-moss opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-moss" />
          </span>
          Live &middot; updated {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "just now"}
        </span>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1 hover:text-mist transition-colors disabled:opacity-60"
          aria-label="Refresh now"
        >
          <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {!products.length ? (
        <div className="dash-card p-10 text-center text-mist-soft">
          {page > 1 ? (
            <button onClick={() => setPage(1)} className="underline">
              Back to the first page
            </button>
          ) : (
            "You haven't added any products yet."
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onToggle={() => toggleMutation.mutate(product.id)}
              onDelete={() => deleteMutation.mutate(product.id)}
              onStock={(stock) => stockMutation.mutate({ id: product.id, stock })}
              onTypingStock={setTypingStock}
            />
          ))}
        </div>
      )}

      {data.num_pages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8 text-sm text-mist-soft">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 disabled:opacity-40 hover:text-mist transition-colors"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span>
            Page {data.page} of {data.num_pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.num_pages, p + 1))}
            disabled={page >= data.num_pages}
            className="inline-flex items-center gap-1 disabled:opacity-40 hover:text-mist transition-colors"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onToggle, onDelete, onStock, onTypingStock }) {
  const [confirming, setConfirming] = useState(false);
  const lowStock = product.stock <= 5;

  return (
    <article className="dash-card overflow-hidden flex flex-col">
      <div className="relative">
        <ProductImage src={product.image} alt={product.name} tone="dark" className="aspect-[4/3] !rounded-none" />
        <button
          type="button"
          onClick={onToggle}
          title="Click to switch between active and inactive"
          className={`absolute left-3 top-3 text-xs px-2.5 py-1 rounded-full font-medium backdrop-blur transition-colors ${
            product.is_active ? "bg-moss text-white" : "bg-ink/70 text-white"
          }`}
        >
          {product.is_active ? "Active" : "Inactive"}
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <Link
          to={`/seller/products/${product.id}/edit`}
          className="font-medium leading-snug hover:text-marigold transition-colors line-clamp-2"
        >
          {product.name}
        </Link>
        <p className="font-display text-xl mt-1">&#8358;{product.price}</p>

        <div className="mt-2 space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs text-mist-soft">
            {product.review_count > 0 ? (
              <>
                <StarRating value={product.average_rating} size={13} tone="dark" />
                {product.average_rating} ({product.review_count})
              </>
            ) : (
              "No reviews yet"
            )}
          </span>
          <VariantBadges colors={product.color_variants} sizes={product.size_variants} tone="dark" />
        </div>

        <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-surface-line">
          <label className="flex items-center gap-2 text-xs text-mist-soft">
            Stock
            <input
              // re-keyed on the server value so a live refresh updates the box
              key={product.stock}
              type="number"
              min={0}
              defaultValue={product.stock}
              onFocus={() => onTypingStock(true)}
              onBlur={(e) => {
                onTypingStock(false);
                const stock = Number(e.target.value);
                if (Number.isInteger(stock) && stock >= 0 && stock !== product.stock) onStock(stock);
              }}
              className="dash-input w-16 !py-1.5"
            />
          </label>
          {lowStock && (
            <span className={`text-xs font-medium whitespace-nowrap ${product.stock === 0 ? "text-rust" : "text-marigold"}`}>
              {product.stock === 0 ? "Out of stock" : "Low stock"}
            </span>
          )}
        </div>

        <div className="mt-4">
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-mist-soft flex-1">Delete this product?</span>
              <button
                onClick={() => {
                  setConfirming(false);
                  onDelete();
                }}
                className="text-xs font-medium bg-rust text-white px-3 py-1.5 rounded-lg hover:opacity-90"
              >
                Yes, delete
              </button>
              <button onClick={() => setConfirming(false)} className="text-xs text-mist-soft hover:text-mist px-2 py-1.5">
                Keep
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                to={`/seller/products/${product.id}/edit`}
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-surface-line px-3 py-2 text-sm text-mist hover:border-mist-soft transition-colors"
              >
                <Pencil size={14} />
                Edit
              </Link>
              <button
                onClick={() => setConfirming(true)}
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-surface-line px-3 py-2 text-sm text-rust hover:border-rust transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function GridSkeleton() {
  return (
    <div>
      <div className="h-9 w-40 rounded bg-surface-line/60 mb-10" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="dash-card overflow-hidden animate-pulse">
            <div className="aspect-[4/3] bg-surface-line/60" />
            <div className="p-4 space-y-3">
              <div className="h-4 w-3/4 rounded bg-surface-line/60" />
              <div className="h-6 w-1/3 rounded bg-surface-line/60" />
              <div className="h-9 rounded bg-surface-line/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
