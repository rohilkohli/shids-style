"use client";

import { useState } from "react";
import Image from "next/image";
import { ThumbsUp, CheckCircle, User } from "lucide-react";
import type { Review } from "@/app/lib/types";

interface ReviewCardProps {
  review: Review;
  onHelpful?: (reviewId: string) => void;
}

const StarRating = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => {
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={`${sizeClass} ${i < rating ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
        >
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
};

const fitLabels = {
  runs_small: "Runs small",
  true_to_size: "True to size",
  runs_large: "Runs large",
};

export function ReviewCard({ review, onHelpful }: ReviewCardProps) {
  const [showImages, setShowImages] = useState(false);
  const [markedHelpful, setMarkedHelpful] = useState(false);

  const handleHelpful = () => {
    if (markedHelpful) return;
    setMarkedHelpful(true);
    onHelpful?.(review.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="border-b border-gray-100 py-6 last:border-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
            <User className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{review.userName}</span>
              {review.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  <CheckCircle className="h-3 w-3" />
                  Verified Purchase
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        <StarRating rating={review.rating} />
      </div>

      {/* Content */}
      <div className="mt-4">
        {review.title && (
          <h4 className="font-medium text-gray-900">{review.title}</h4>
        )}
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{review.content}</p>
      </div>

      {/* Fit & Size Info */}
      {(review.size || review.fit) && (
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          {review.size && <span>Size purchased: {review.size}</span>}
          {review.fit && (
            <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1">
              {fitLabels[review.fit]}
            </span>
          )}
        </div>
      )}

      {/* Images */}
      {review.images && review.images.length > 0 && (
        <div className="mt-4">
          {!showImages ? (
            <button
              onClick={() => setShowImages(true)}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              View {review.images.length} photo{review.images.length > 1 ? "s" : ""}
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              {review.images.map((img, idx) => (
                <div key={idx} className="relative h-20 w-20 rounded-lg overflow-hidden">
                  <Image
                    src={img}
                    alt={`Review image ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={handleHelpful}
          disabled={markedHelpful}
          className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
            markedHelpful
              ? "text-green-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ThumbsUp className="h-4 w-4" />
          Helpful ({review.helpful + (markedHelpful ? 1 : 0)})
        </button>
        <button className="text-xs text-gray-400 hover:text-gray-600">
          Report
        </button>
      </div>
    </div>
  );
}
