import React from "react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency, toTitleCase } from "../lib/utils";
import type { Variant } from "../lib/types";

export type UnifiedProductCardProps = {
  id: string;
  name: string;
  image: string;
  price: number;
  oldPrice?: number;
  bestseller?: boolean;
  badge?: string;
  discountPercent?: number;
  stock?: number;
  variants?: Variant[];
  category?: string;
  rating?: number;
  colors?: (string | { name: string; hex: string })[];
  onClick?: () => void;
  slug: string;
  wished?: boolean;
  onWishlist?: (id: string) => void;
  onAdd?: (id: string) => void;
};

const SHIPPING_DURATION = "48 hours";

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const HEX_COLOR_WITHOUT_HASH_PATTERN = /^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export default function UnifiedProductCard({
  id,
  name,
  image,
  price,
  oldPrice,
  bestseller,
  badge,
  discountPercent,
  stock = 999,
  // sku removed: not used in the card UI
  category,
  rating,
  colors,
  variants,
  onClick,
  slug,
  wished = false,
  onWishlist,
  onAdd,
}: UnifiedProductCardProps) {
  // Only show discount when admin explicitly set `discountPercent`
  const computedDiscount = typeof discountPercent === "number" ? discountPercent : 0;
  // Variant-aware stock summary
  const variantCount = variants?.length ?? 0;
  const totalVariantStock = variants?.reduce((s, v) => s + (v.stock ?? 0), 0) ?? 0;
  const singleVariant = variantCount === 1;
  const lowStock = singleVariant ? (stock > 0 && stock <= 3) : (totalVariantStock > 0 && totalVariantStock <= 3);
  const outOfStock = singleVariant ? stock === 0 : totalVariantStock === 0;

  const displayColors = colors ?? [];

  const normalizeHex = (rawHex?: string) => {
    if (!rawHex) return "";
    const cleaned = rawHex.trim();
    if (HEX_COLOR_PATTERN.test(cleaned)) return cleaned;
    if (HEX_COLOR_WITHOUT_HASH_PATTERN.test(cleaned)) return `#${cleaned}`;
    return "";
  };

  const productImage = image?.trim() || "/file.svg";

  const getColorMeta = (color: string | { name: string; hex: string }) => {
    if (typeof color === "string") {
      return {
        name: color,
        hex: normalizeHex(color),
      };
    }

    return {
      name: color.name,
      hex: normalizeHex(color.hex),
    };
  };

  return (
    <div className="group relative h-full flex flex-col rounded-2xl overflow-hidden card-surface hover-3d">
      {/* Badges */}
      {/* Badges */}
      <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-2 max-w-[70%]">
        {/* Only show badge if set by admin */}
        {badge && (
          <span className="inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-900 shadow leading-tight">
            {badge}
          </span>
        )}
        {/* Discount tag removed from badge area */}
        {/* Always show bestseller if set, regardless of badge */}
        {bestseller && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-md border border-gray-200 px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-800 shadow-sm leading-tight">
            <svg className="w-3 h-3 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Best Seller
          </span>
        )}
      </div>
      {/* Wishlist button */}
      {onWishlist && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
          <button
            className={`rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-colors icon-button text-lg leading-none ${wished ? "bg-[color:var(--primary)] text-white border-transparent" : "hover:bg-[color:var(--primary-soft)]"
              }`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onWishlist(id);
            }}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={wished}
          >
            {wished ? "♥" : "♡"}
          </button>
        </div>
      )}

      {/* Product Image */}
      <Link
        href={`/products/${slug}`}
        className="block relative w-full aspect-[3/4] rounded-xl overflow-hidden flex-shrink-0 border border-black/5 bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#eef2ff_100%)]"
      >
        <Image
          src={productImage}
          alt={name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-contain p-3 drop-shadow-[0_10px_18px_rgba(15,23,42,0.18)] transition-transform duration-300 group-hover:scale-105"
          quality={85}
        />
      </Link>

      {/* Quick View button - desktop only */}
      {onClick && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
          }}
          className="hidden sm:block absolute bottom-[45%] left-1/2 -translate-x-1/2 z-20 
            rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-gray-900 
            shadow-lg backdrop-blur-sm opacity-0 translate-y-2 
            transition-all duration-200 ease-out
            group-hover:opacity-100 group-hover:translate-y-0
            hover:bg-black hover:text-white"
          aria-label="Quick view"
        >
          Quick View
        </button>
      )}

      {/* Product Details */}
      <div className="p-3 sm:p-4 space-y-2.5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/products/${slug}`} className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 min-h-[2.5rem]">
              {toTitleCase(name)}
            </h3>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] sm:text-sm text-gray-500 min-h-[1.75rem]">
          {category && <span className="truncate">{category}</span>}
          {rating ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] sm:text-[11px] font-semibold text-gray-700 flex-shrink-0">
              <svg viewBox="0 0 24 24" className="h-3 w-3 text-amber-500" fill="currentColor" aria-hidden="true">
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              {rating.toFixed(1)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] sm:text-[11px] font-semibold text-gray-700 flex-shrink-0" aria-label="Fresh drop">
              Fresh drop
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-gray-900">{formatCurrency(price)}</span>
          {oldPrice && oldPrice !== price && (
            <span className="text-sm text-gray-400 line-through">{formatCurrency(oldPrice)}</span>
          )}
          {/* Discount percent as red text after price, only when admin set it */}
          {computedDiscount > 0 && (
            <span className="text-sm font-semibold text-red-600 ml-1">{computedDiscount}% OFF</span>
          )}
        </div>

        <div className="min-h-[1.5rem]">
          {displayColors.length > 0 && (
              <div className="flex items-center gap-1.5">
                {displayColors.slice(0, 4).map((color, idx) => {
                  const { name, hex } = getColorMeta(color);
                  return (
                    <span
                      key={`${name}-${idx}`}
                      className="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-black/10 bg-gray-200 px-1 text-[9px] font-semibold uppercase text-gray-700 shadow-sm sm:h-5 sm:min-w-5"
                      style={hex ? { backgroundColor: hex } : undefined}
                      aria-label={`Color ${name}`}
                      title={name}
                    >
                      {!hex ? name.charAt(0) : null}
                    </span>
                  );
                })}
                {displayColors.length > 4 && (
                  <span className="text-[10px] sm:text-[11px] text-gray-600 font-semibold">
                    +{displayColors.length - 4}
                  </span>
                )}
              </div>
            )}
        </div>

        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-500 min-h-[1.5rem]">
          <span className="inline-flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            Ships in {SHIPPING_DURATION}
          </span>
          {variantCount > 1 ? (
            <span className="text-[10px] sm:text-[11px] font-semibold text-gray-600">{variantCount} variants</span>
          ) : (
            lowStock && (
              <span className="text-[10px] sm:text-[11px] font-semibold text-amber-700">
                Only {stock} left
              </span>
            )
          )}
        </div>

        {onAdd && (
          <button
            className={`w-full rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium transition ${outOfStock
              ? "bg-gray-200 text-gray-600 cursor-not-allowed border border-gray-300"
              : "btn-primary"
              }`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAdd(id);
            }}
            disabled={outOfStock}
          >
            {outOfStock ? "Sold Out" : "Add to Bag"}
          </button>
        )}
      </div>
    </div>
  );
}
