"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ShoppingBag, Heart, Check } from "lucide-react";
import { formatCurrency, toTitleCase } from "@/app/lib/utils";
import { getProductPrice } from "@/app/lib/store";
import type { Product } from "@/app/lib/types";

// NOTE: we only display discount when admin sets `product.discountPercent`.

interface ProductQuickViewProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, size?: string, color?: string) => void;
  onWishlist: (productId: string) => void;
  isWished: boolean;
}

export function ProductQuickView({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onWishlist,
  isWished,
}: ProductQuickViewProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(
    product.sizes?.[0] ?? null
  );
  const firstColor = product.colors?.[0];
  const initialColor = typeof firstColor === "string" ? firstColor : firstColor ? firstColor.name : null;
  const [selectedColor, setSelectedColor] = useState<string | null>(initialColor);
  const [added, setAdded] = useState(false);

  const { sale, compareAt } = getProductPrice(product);
  const images = product.images ?? [];
  const inStock = product.stock > 0;

  const handleAddToCart = () => {
    onAddToCart(product, selectedSize ?? undefined, selectedColor ?? undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (!isOpen || typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 shadow-sm"
          aria-label="Close quick view"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image Section */}
          <div className="relative bg-gray-50">
            <div className="aspect-[3/4] relative">
              <Image
                src={images[currentImageIndex] ?? "/file.svg"}
                alt={product.name}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
              
              {/* Discount badge */}
              {product.discountPercent && product.discountPercent > 0 && (
                <span className="absolute left-3 top-3 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                  -{product.discountPercent}%
                </span>
              )}
            </div>

            {/* Image navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md hover:bg-white"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md hover:bg-white"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                
                {/* Image dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        idx === currentImageIndex
                          ? "bg-black"
                          : "bg-black/30 hover:bg-black/50"
                      }`}
                      aria-label={`View image ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {images.slice(0, 5).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg transition-all ${
                      idx === currentImageIndex
                        ? "ring-2 ring-black"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="p-6 flex flex-col">
            <div className="flex-1 space-y-4">
              {/* Category */}
              <p className="text-sm text-gray-500 uppercase tracking-wide">
                {product.category}
              </p>

              {/* Title */}
              <h2
                id="quick-view-title"
                className="text-xl font-bold text-gray-900"
              >
                {toTitleCase(product.name)}
              </h2>

              {/* Rating */}
              {product.rating && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 ${
                        i < Math.floor(product.rating!)
                          ? "text-amber-400"
                          : "text-gray-200"
                      }`}
                      fill="currentColor"
                    >
                      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                  <span className="ml-1 text-sm text-gray-600">
                    {product.rating.toFixed(1)}
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(sale)}
                </span>
                {compareAt !== sale && (
                  <span className="text-lg text-gray-400 line-through">
                    {formatCurrency(compareAt)}
                  </span>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-sm text-gray-600 line-clamp-3">
                  {product.description.replace(/<[^>]*>/g, "").slice(0, 200)}...
                </p>
              )}

              {/* Sizes */}
              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Size</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-[3rem] rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          selectedSize === size
                            ? "border-black bg-black text-white"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Colors */}
              {product.colors && product.colors.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Color</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((color) => {
                      const name = typeof color === "string" ? color : color.name;
                      const hex = typeof color === "string" ? color : color.hex;
                      return (
                        <button
                          key={name}
                          onClick={() => setSelectedColor(name)}
                          className={`h-8 w-8 rounded-full border-2 transition-all ${
                            selectedColor === name
                              ? "border-black ring-2 ring-black ring-offset-2"
                              : "border-gray-200 hover:border-gray-400"
                          }`}
                          style={{ backgroundColor: hex }}
                          aria-label={`Select color ${name}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stock status */}
              {!inStock ? (
                <p className="text-sm font-medium text-red-600">Out of Stock</p>
              ) : product.stock <= 5 ? (
                <p className="text-sm font-medium text-amber-600 flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                  Only {product.stock} left in stock
                </p>
              ) : null}
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={!inStock}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all ${
                    added
                      ? "bg-green-500 text-white"
                      : inStock
                      ? "bg-black text-white hover:bg-gray-800"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="h-5 w-5" />
                      Added!
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-5 w-5" />
                      {inStock ? "Add to Bag" : "Sold Out"}
                    </>
                  )}
                </button>
                <button
                  onClick={() => onWishlist(product.id)}
                  className={`flex items-center justify-center rounded-full p-3 border transition-colors ${
                    isWished
                      ? "bg-red-50 border-red-200 text-red-500"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                  aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <Heart className={`h-5 w-5 ${isWished ? "fill-current" : ""}`} />
                </button>
              </div>

              <Link
                href={`/products/${product.slug}`}
                onClick={onClose}
                className="block w-full text-center text-sm font-medium text-gray-600 hover:text-black transition-colors"
              >
                View Full Details →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
