import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchProduct } from "../../api/catalog";
import { useCart } from "../../hooks/useCart";
import ProductGallery from "../../components/product/ProductGallery";
import RecentlyViewed from "../../components/product/RecentlyViewed";
import ReviewSection from "../../components/product/ReviewSection";
import StarRating from "../../components/product/StarRating";
import { sortSizes } from "../../components/product/variantUtils";

export default function ProductDetail() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const { addItem } = useCart();

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProduct(slug, referralCode),
  });

  if (isLoading) return <p className="text-ink-soft">Loading...</p>;
  if (isError || !product) return <p className="text-rust">Product not found.</p>;

  return (
    <div>
      <Link to="/products" className="text-sm text-ink-soft hover:text-ink transition-colors">
        &larr; Back to shop
      </Link>

      <div className="grid md:grid-cols-2 gap-14 mt-6">
        <ProductGallery
          key={product.id}
          images={[
            product.image && { src: product.image, alt: product.name },
            ...(product.gallery_images ?? []).map((g) => ({ src: g.image, alt: g.alt_text || product.name })),
          ].filter(Boolean)}
        />

        <div className="md:pt-4">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{product.name}</h1>
          <p className="font-display text-2xl mt-2">&#8358;{product.price}</p>

          {product.average_rating ? (
            <a href="#reviews" className="flex items-center gap-2 text-sm text-ink-soft mt-2 hover:text-ink transition-colors">
              <StarRating value={product.average_rating} size={16} />
              {product.average_rating} / 5 &middot; {product.review_count} reviews
            </a>
          ) : (
            <a href="#reviews" className="block text-sm text-ink-soft mt-2 hover:text-ink transition-colors">
              No reviews yet
            </a>
          )}

          <p className="text-ink-soft mt-6 leading-relaxed whitespace-pre-line max-w-[60ch]">
            {product.description}
          </p>

          {product.color_variants?.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-ink-soft mb-2">
                Colour{selectedColor && <span className="text-ink">: {selectedColor.name}</span>}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {product.color_variants.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={selectedColor?.id === c.id}
                    onClick={() => setSelectedColor(selectedColor?.id === c.id ? null : c)}
                    className={`h-9 w-9 rounded-full ring-1 ring-ink/20 ring-offset-2 ring-offset-paper transition ${
                      selectedColor?.id === c.id ? "!ring-2 !ring-ink" : "hover:ring-ink/50"
                    }`}
                    style={{ backgroundColor: c.hex_code || "transparent" }}
                  />
                ))}
              </div>
            </div>
          )}

          {product.size_variants?.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-ink-soft mb-2">
                Size{selectedSize && <span className="text-ink">: {selectedSize}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {sortSizes(product.size_variants.map((s) => s.label)).map((label) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={selectedSize === label}
                    onClick={() => setSelectedSize(selectedSize === label ? null : label)}
                    className={`min-w-[3rem] px-4 py-2 rounded-lg text-sm border transition-colors ${
                      selectedSize === label
                        ? "bg-ink text-paper border-ink"
                        : "border-paper-line text-ink hover:border-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-sm text-ink-soft mt-6">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>

          <div className="flex items-center gap-3 mt-8">
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-20 bg-transparent border border-paper-line rounded-lg px-3 py-2.5 text-center outline-none focus:border-ink transition-colors"
            />
            <button
              disabled={product.stock <= 0}
              onClick={() => addItem(product.id, quantity)}
              className="flex-1 bg-ink text-paper py-2.5 rounded-full hover:bg-indigo transition-colors disabled:opacity-40"
            >
              Add to cart
            </button>
          </div>
        </div>
      </div>

      <div id="reviews">
        <ReviewSection product={product} />
      </div>

      <RecentlyViewed excludeSlug={product.slug} />
    </div>
  );
}
