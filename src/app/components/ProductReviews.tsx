"use client";

import { supabase } from "@/app/lib/supabase/client";
import { Star } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type ProductReviewsProps = {
  productId: string;
};

type ReviewItem = {
  id: number;
  userId: string;
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

const renderStars = (rating: number) => (
  <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
    {Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${index < rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
      />
    ))}
  </div>
);

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    const response = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`, {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json()) as { ok: boolean; data?: ReviewItem[]; error?: string };

    if (!response.ok || !payload.ok) {
      setError(payload.error ?? "Failed to load reviews.");
      return;
    }

    setError(null);
    setReviews(payload.data ?? []);
  }, [productId]);

  useEffect(() => {
    const run = async () => {
      await loadReviews();
    };

    void run();
  }, [loadReviews]);

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsLoggedIn(Boolean(user));
    })();
  }, []);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return null;
    return reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length;
  }, [reviews]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId, rating, comment }),
    });

    const payload = (await response.json()) as { ok: boolean; error?: string };

    if (!response.ok || !payload.ok) {
      setError(payload.error ?? "Unable to submit review.");
      setIsSubmitting(false);
      return;
    }

    setComment("");
    setRating(5);
    setIsSubmitting(false);
    await loadReviews();
  };

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Product Reviews</h2>
        {averageRating !== null && (
          <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
            {renderStars(Math.round(averageRating))}
            <span>{averageRating.toFixed(1)} / 5</span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-gray-500">No reviews yet. Be the first to review this product.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">{review.userName}</p>
                {renderStars(review.rating)}
              </div>
              <p className="mt-2 text-sm text-gray-700">{review.comment}</p>
            </li>
          ))}
        </ul>
      )}

      {isLoggedIn && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-gray-100 p-4">
          <div>
            <label htmlFor="rating" className="mb-1 block text-sm font-medium text-gray-700">
              Rating
            </label>
            <select
              id="rating"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} star{value === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="comment" className="mb-1 block text-sm font-medium text-gray-700">
              Comment
            </label>
            <textarea
              id="comment"
              className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              required
              maxLength={2000}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
