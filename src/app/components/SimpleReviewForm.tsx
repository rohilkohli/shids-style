"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Loader2, LogIn } from "lucide-react";
import { useCommerceStore } from "@/app/lib/store";

interface SimpleReviewFormProps {
  productId: string;
  productName: string;
  onSubmit: (review: SimpleReviewData) => Promise<void>;
  onCancel: () => void;
}

export interface SimpleReviewData {
  rating: number;
  feedback: string;
  userId: string;
  userName: string;
  userEmail: string;
}

export function SimpleReviewForm({
  productId,
  productName,
  onSubmit,
  onCancel,
}: SimpleReviewFormProps) {
  const { user } = useCommerceStore();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  void productId; // Will be used when wiring to API

  // If user is not logged in, show login prompt
  if (!user) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <LogIn className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Sign in to leave a review
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          You need to be logged in to rate and review products.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Please select a rating");
      return;
    }
    if (!feedback.trim()) {
      setError("Please write your feedback");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        rating,
        feedback: feedback.trim(),
        userId: user.id,
        userName: user.name || "Anonymous",
        userEmail: user.email,
      });
    } catch {
      setError("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Rate this product</h3>
        <p className="text-sm text-gray-500">{productName}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Your Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= displayRating
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-300 hover:text-amber-200"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <span className="text-sm text-gray-600 font-medium">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </span>
            )}
          </div>
        </div>

        {/* Feedback */}
        <div>
          <label htmlFor="review-feedback" className="block text-sm font-medium text-gray-700 mb-2">
            Your Feedback <span className="text-red-500">*</span>
          </label>
          <textarea
            id="review-feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your experience with this product..."
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
            maxLength={500}
          />
          <p className="mt-1 text-xs text-gray-400 text-right">{feedback.length}/500</p>
        </div>

        {/* User Info Display */}
        <div className="text-sm text-gray-500 bg-gray-50 px-4 py-3 rounded-lg">
          Reviewing as <span className="font-medium text-gray-700">{user.name || user.email}</span>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Review"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
