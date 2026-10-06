import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { submitReview } from "../../api/catalog";
import { normalizeApiError } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import StarRating, { StarInput } from "./StarRating";

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function ReviewSection({ product }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const reviews = product.reviews ?? [];
  const total = reviews.length;
  const counts = [5, 4, 3, 2, 1].map((n) => reviews.filter((r) => r.rating === n).length);

  const mutation = useMutation({
    mutationFn: () => submitReview(product.slug, { rating, comment: comment.trim() }),
    onSuccess: () => {
      toast.success("Thanks for your review!");
      setRating(0);
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["product", product.slug] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!rating) {
      toast.error("Please choose a star rating.");
      return;
    }
    mutation.mutate();
  }

  return (
    <section className="mt-20 pt-12 border-t border-paper-line">
      <h2 className="font-display text-2xl font-semibold tracking-tight mb-8">Ratings &amp; reviews</h2>

      <div className="grid md:grid-cols-[260px_1fr] gap-12">
        <div>
          {total > 0 ? (
            <>
              <p className="font-display text-5xl">{product.average_rating}</p>
              <StarRating value={product.average_rating} size={18} className="mt-2" />
              <p className="text-sm text-ink-soft mt-2">
                {total} review{total === 1 ? "" : "s"}
              </p>
              <div className="mt-5 space-y-1.5">
                {[5, 4, 3, 2, 1].map((n, i) => (
                  <div key={n} className="flex items-center gap-2 text-xs text-ink-soft">
                    <span className="w-3 text-right">{n}</span>
                    <div className="h-1.5 flex-1 rounded-full bg-ink/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-marigold"
                        style={{ width: `${(counts[i] / total) * 100}%` }}
                      />
                    </div>
                    <span className="w-5">{counts[i]}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-ink-soft">No reviews yet. Be the first to share what you think.</p>
          )}
        </div>

        <div>
          {isAuthenticated ? (
            <form onSubmit={handleSubmit} className="rounded-2xl ring-1 ring-ink/10 p-5 mb-10">
              <p className="text-sm font-medium mb-2">Write a review</p>
              <StarInput value={rating} onChange={setRating} />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="What did you like or dislike? (optional)"
                className="mt-4 w-full bg-transparent border border-paper-line rounded-lg px-3 py-2.5 text-sm outline-none focus:border-ink transition-colors"
              />
              <button
                disabled={mutation.isPending}
                className="mt-3 bg-ink text-paper text-sm px-5 py-2 rounded-full hover:bg-indigo transition-colors disabled:opacity-40"
              >
                {mutation.isPending ? "Posting..." : "Post review"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-ink-soft mb-10">
              <Link to="/login" className="underline hover:text-ink transition-colors">Log in</Link> to leave a review.
            </p>
          )}

          <ul className="divide-y divide-paper-line">
            {reviews.map((review) => (
              <li key={review.id} className="py-5 first:pt-0">
                <div className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-full bg-indigo text-paper text-sm flex items-center justify-center uppercase">
                    {review.username?.[0] ?? "?"}
                  </span>
                  <div>
                    <p className="text-sm font-medium leading-tight">{review.username}</p>
                    <p className="text-xs text-ink-soft">{formatDate(review.created_at)}</p>
                  </div>
                  <StarRating value={review.rating} size={14} className="ml-auto" />
                </div>
                {review.comment && (
                  <p className="text-ink-soft mt-3 leading-relaxed whitespace-pre-line max-w-[60ch]">
                    {review.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
