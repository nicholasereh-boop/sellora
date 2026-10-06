import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchPublicStore, fetchPublicStoreProducts } from "../../api/sellers";
import ProductImage from "../../components/product/ProductImage";
import StarRating from "../../components/product/StarRating";
import VariantBadges from "../../components/product/VariantBadges";

const SORTS = [
  ["newest", "Newest"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"],
];

export default function PublicStorePage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get("sort") ?? "newest";
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const { data: store, isLoading: storeLoading, isError: storeError } = useQuery({
    queryKey: ["public-store", slug],
    queryFn: () => fetchPublicStore(slug),
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["public-store-products", slug, sort, searchParams.get("q")],
    queryFn: () => fetchPublicStoreProducts(slug, { q: searchParams.get("q"), sort }),
    enabled: Boolean(store),
  });

  function handleSearchSubmit(e) {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (search) next.set("q", search);
    else next.delete("q");
    setSearchParams(next);
  }

  function handleSortChange(value) {
    const next = new URLSearchParams(searchParams);
    next.set("sort", value);
    setSearchParams(next);
  }

  if (storeLoading) return <p className="text-ink-soft">Loading store...</p>;
  if (storeError || !store) return <p className="text-rust">This store isn't available.</p>;

  return (
    <div>
      <div className="relative -mx-4 md:-mx-8 mb-10">
        <div className="h-40 md:h-56 bg-ink/5 overflow-hidden">
          {store.banner && (
            <img src={store.banner} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="flex items-end gap-5 -mt-10">
            <div className="w-20 h-20 rounded-full bg-paper border-4 border-paper overflow-hidden flex-shrink-0">
              {store.logo && (
                <img src={store.logo} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="pb-1">
              <h1 className="font-display text-3xl">{store.store_name}</h1>
              {store.review_count > 0 && (
                <p className="text-sm text-ink-soft">
                  {store.average_rating} / 5 &middot; {store.review_count} reviews
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {store.store_description && (
        <p className="text-ink-soft max-w-[60ch] mb-10">{store.store_description}</p>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search this store..."
            className="bg-transparent border border-paper-line rounded-lg px-3 py-2 text-sm w-64 focus:border-ink outline-none transition-colors"
          />
          <button className="bg-ink text-paper text-sm px-4 py-2 rounded-full hover:bg-indigo transition-colors">
            Search
          </button>
        </form>

        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="bg-transparent border border-paper-line rounded-lg px-3 py-2 text-sm outline-none"
        >
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {productsLoading && <p className="text-ink-soft">Loading products...</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        {products?.results?.map((product) => (
          <Link key={product.id} to={`/products/${product.slug}`} className="group">
            <ProductImage
              src={product.image}
              alt={product.name}
              zoom
              className="aspect-square mb-3 !rounded-2xl"
            />
            <p className="text-sm font-medium">{product.name}</p>
            <p className="text-sm text-ink-soft">&#8358;{product.price}</p>
            {product.review_count > 0 && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-ink-soft">
                <StarRating value={product.average_rating} size={13} />
                <span>({product.review_count})</span>
              </div>
            )}
            <VariantBadges colors={product.color_variants} sizes={product.size_variants} className="mt-1.5" />
          </Link>
        ))}
      </div>

      {products?.results?.length === 0 && (
        <p className="text-ink-soft">No products found.</p>
      )}
    </div>
  );
}
