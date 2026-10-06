import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { fetchAffiliateLinks, generateAffiliateLink } from "../../api/affiliates";

function copyLink(url) {
  navigator.clipboard.writeText(url);
  toast.success("Link copied.");
}

export default function AffiliateLinks() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-links"],
    queryFn: fetchAffiliateLinks,
  });

  const generateMutation = useMutation({
    mutationFn: generateAffiliateLink,
    onSuccess: () => {
      toast.success("Referral link generated.");
      queryClient.invalidateQueries({ queryKey: ["affiliate-links"] });
    },
    onError: (error) => toast.error(error.response?.data?.error?.message ?? "Could not generate link."),
  });

  if (isLoading) return <p className="text-mist-soft">Loading links...</p>;

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Referral links</h1>

      {data.links.length > 0 && (
        <>
          <p className="text-sm text-mist-soft mb-3">Your active links</p>
          <div className="dash-card divide-y divide-surface-line mb-10">
            {data.links.map((link) => (
              <div key={link.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-12 h-12 bg-canvas rounded-lg overflow-hidden flex-shrink-0">
                  {link.product_image && (
                    <img src={link.product_image} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/affiliate/links/${link.id}`} className="font-medium hover:text-marigold transition-colors">
                    {link.product_name}
                  </Link>
                  <p className="text-xs text-mist-soft truncate max-w-xs">{link.target_url}</p>
                </div>
                <div className="text-right text-sm text-mist-soft hidden sm:block">
                  <p>{link.click_count} clicks &middot; {link.conversion_count} sales</p>
                  <p className="text-moss">&#8358;{link.earnings} earned</p>
                </div>
                <button
                  onClick={() => copyLink(link.target_url)}
                  className="dash-btn-ghost flex items-center gap-1"
                >
                  <Copy size={15} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-sm text-mist-soft mb-3">Products you can promote</p>
      {!data.promotable_products.length && (
        <p className="text-mist-soft text-sm">No more products to promote right now.</p>
      )}
      <div className="dash-card divide-y divide-surface-line">
        {data.promotable_products.map((product) => (
          <div key={product.id} className="flex items-center gap-4 px-5 py-4">
            <div className="w-12 h-12 bg-canvas rounded-lg overflow-hidden flex-shrink-0">
              {product.image && (
                <img src={product.image} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{product.name}</p>
              <p className="text-xs text-mist-soft">
                &#8358;{product.price} &middot; earn ~&#8358;{product.estimated_commission} ({product.affiliate_commission_rate}%)
              </p>
            </div>
            <button
              disabled={generateMutation.isPending}
              onClick={() => generateMutation.mutate(product.id)}
              className="dash-btn-primary text-xs px-3 py-1.5"
            >
              Get link
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
