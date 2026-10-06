import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories, fetchProducts } from "../../api/catalog";
import ProductImage from "../../components/product/ProductImage";
import RecentlyViewed from "../../components/product/RecentlyViewed";
import StarRating from "../../components/product/StarRating";
import VariantBadges from "../../components/product/VariantBadges";

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", { category, search: searchParams.get("search") }],
    queryFn: () => fetchProducts({ category, search: searchParams.get("search") }),
  });

  function handleSearchSubmit(e) {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (search) next.set("search", search);
    else next.delete("search");
    setSearchParams(next);
  }

  function handleCategoryClick(slug) {
    const next = new URLSearchParams(searchParams);
    if (slug) next.set("category", slug);
    else next.delete("category");
    setSearchParams(next);
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            {category
              ? categories?.find((c) => c.slug === category)?.name ?? "Shop"
              : "Shop"}
          </h1>
          <p className="text-ink-soft mt-1">
            {data?.count != null ? `${data.count} items from independent sellers` : "\u00A0"}
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            className="bg-transparent border-b border-paper-line focus:border-ink px-1 py-2 text-sm w-56 outline-none transition-colors"
          />
        </form>
      </div>

      {categories?.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-10 border-b border-paper-line pb-6">
          <button
            onClick={() => handleCategoryClick("")}
            className={!category ? "text-ink font-medium" : "text-ink-soft hover:text-ink transition-colors"}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCategoryClick(c.slug)}
              className={
                category === c.slug
                  ? "text-ink font-medium"
                  : "text-ink-soft hover:text-ink transition-colors"
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {isLoading && <p className="text-ink-soft">Loading products...</p>}
      {isError && <p className="text-rust">Could not load products.</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-10">
        {data?.results?.map((product) => (
          <Link key={product.id} to={`/products/${product.slug}`} className="group block">
            <ProductImage
              src={product.image}
              alt={product.name}
              zoom
              className="aspect-[4/5] mb-3 !rounded-2xl"
            />
            <p className="text-sm text-ink leading-snug">{product.name}</p>
            <p className="font-display text-lg mt-0.5">₦{product.price}</p>
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

      {data?.results?.length === 0 && (
        <p className="text-ink-soft py-16 text-center">No products found.</p>
      )}

      <RecentlyViewed />
    </div>
  );
}
