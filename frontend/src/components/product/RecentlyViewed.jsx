import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchRecentlyViewed } from "../../api/catalog";
import ProductImage from "./ProductImage";
import StarRating from "./StarRating";

// "Recently viewed" strip for the storefront. The list lives in the
// Django session (maintained when a product page is opened), so it
// follows the visitor without storing anything in the browser.
// `excludeSlug` leaves out the product currently being viewed.
// Renders nothing until there is something to show.
export default function RecentlyViewed({ excludeSlug }) {
  const { data: products } = useQuery({
    queryKey: ["recently-viewed", excludeSlug ?? null],
    queryFn: () => fetchRecentlyViewed(excludeSlug),
    staleTime: 0,
    refetchOnMount: "always",
  });

  if (!products?.length) return null;

  return (
    <section className="mt-20 pt-12 border-t border-paper-line">
      <h2 className="font-display text-2xl font-semibold tracking-tight mb-6">Recently viewed</h2>

      <div className="flex gap-5 overflow-x-auto pb-3 -mx-1 px-1">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/products/${product.slug}`}
            className="group block w-40 md:w-48 flex-shrink-0"
          >
            <ProductImage
              src={product.image}
              alt={product.name}
              zoom
              className="aspect-square mb-2.5 !rounded-2xl"
            />
            <p className="text-sm text-ink leading-snug truncate">{product.name}</p>
            <p className="font-display text-base mt-0.5">&#8358;{product.price}</p>
            {product.review_count > 0 && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-ink-soft">
                <StarRating value={product.average_rating} size={12} />
                <span>({product.review_count})</span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
