"use client";

import { useState, useMemo } from "react";
import { Star, ChevronDown, MessageSquare, Edit3 } from "lucide-react";
import { ReviewCard } from "./ReviewCard";
import type { Review, ReviewStats } from "@/app/lib/types";

interface ReviewsListProps {
  reviews: Review[];
  stats: ReviewStats;
  onWriteReview: () => void;
  onHelpful?: (reviewId: string) => void;
}

type SortOption = "newest" | "oldest" | "highest" | "lowest" | "helpful";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Most Recent" },
  { value: "oldest", label: "Oldest First" },
  { value: "highest", label: "Highest Rated" },
  { value: "lowest", label: "Lowest Rated" },
  { value: "helpful", label: "Most Helpful" },
];

function RatingBar({ rating, count, total }: { rating: number; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-6">{rating}</span>
      <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
    </div>
  );
}

export function ReviewsList({
  reviews,
  stats,
  onWriteReview,
  onHelpful,
}: ReviewsListProps) {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const sortedReviews = useMemo(() => {
    let filtered = [...reviews];

    // Apply rating filter
    if (filterRating !== null) {
      filtered = filtered.filter((r) => r.rating === filterRating);
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "highest":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "lowest":
        filtered.sort((a, b) => a.rating - b.rating);
        break;
      case "helpful":
        filtered.sort((a, b) => b.helpful - a.helpful);
        break;
    }

    return filtered;
  }, [reviews, sortBy, filterRating]);

  const displayedReviews = showAllReviews ? sortedReviews : sortedReviews.slice(0, 5);

  return (
    <div>
      {/* Reviews Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Customer Reviews</h2>
          <p className="text-sm text-gray-500">{stats.totalReviews} reviews</p>
        </div>
        <button
          onClick={onWriteReview}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Edit3 className="h-4 w-4" />
          Write a Review
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 mb-8 p-6 bg-gray-50 rounded-2xl">
        {/* Average Rating */}
        <div className="text-center md:border-r md:border-gray-200 md:pr-8">
          <div className="text-5xl font-bold text-gray-900">
            {stats.averageRating.toFixed(1)}
          </div>
          <div className="flex justify-center gap-0.5 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < Math.round(stats.averageRating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              onClick={() =>
                setFilterRating(filterRating === rating ? null : rating)
              }
              className={`w-full transition-opacity ${
                filterRating !== null && filterRating !== rating
                  ? "opacity-40"
                  : ""
              }`}
            >
              <RatingBar
                rating={rating}
                count={stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution]}
                total={stats.totalReviews}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Filter indicator */}
      {filterRating !== null && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Showing {sortedReviews.length} review{sortedReviews.length !== 1 ? "s" : ""} with {filterRating} star{filterRating !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setFilterRating(null)}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Sort & Filter Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <span className="text-sm text-gray-600">
          {sortedReviews.length} review{sortedReviews.length !== 1 ? "s" : ""}
        </span>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/5"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Reviews List */}
      {sortedReviews.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No reviews yet</h3>
          <p className="text-sm text-gray-500 mt-1">
            Be the first to review this product
          </p>
          <button
            onClick={onWriteReview}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Edit3 className="h-4 w-4" />
            Write a Review
          </button>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {displayedReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onHelpful={onHelpful}
              />
            ))}
          </div>

          {/* Load More */}
          {sortedReviews.length > 5 && !showAllReviews && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setShowAllReviews(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Show All {sortedReviews.length} Reviews
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
