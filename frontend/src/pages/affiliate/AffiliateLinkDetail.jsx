import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { fetchAffiliateLink } from "../../api/affiliates";

export default function AffiliateLinkDetail() {
  const { id } = useParams();
  const { data: link, isLoading } = useQuery({
    queryKey: ["affiliate-link", id],
    queryFn: () => fetchAffiliateLink(id),
  });

  if (isLoading) return <p className="text-mist-soft">Loading link...</p>;

  const stats = [
    ["Clicks", link.click_count],
    ["Conversions", link.conversion_count],
    ["Commission rate", `${link.commission_rate}%`],
    ["Total earned", `\u20a6${link.earnings}`],
  ];

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-canvas rounded-lg overflow-hidden flex-shrink-0">
          {link.product_image && (
            <img src={link.product_image} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div>
          <h1 className="font-display text-2xl">{link.product_name}</h1>
          <p className="text-sm text-mist-soft">Referral code: {link.referral_code}</p>
        </div>
      </div>

      <div className="dash-card p-4 flex items-center justify-between mb-6">
        <p className="text-sm text-mist truncate mr-3">{link.target_url}</p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(link.target_url);
            toast.success("Link copied.");
          }}
          className="dash-btn-ghost flex items-center gap-1 flex-shrink-0"
        >
          <Copy size={15} />
          Copy
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map(([label, value]) => (
          <div key={label} className="dash-card p-5">
            <p className="text-xs text-mist-soft mb-1">{label}</p>
            <p className="font-display text-xl">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
