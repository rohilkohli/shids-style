"use client";

import Link from "next/link";
import { ChevronRight, Flame, Sparkles, TrendingUp } from "lucide-react";
import { getProductPrice } from "@/app/lib/store";
import type { Product } from "@/app/lib/types";
import UnifiedProductCard from "./UnifiedProductCard";

interface ProductShowcaseSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllLink?: string;
  icon?: "new" | "trending" | "hot";
  maxProducts?: number;
}

const icons = {
  new: <Sparkles className="h-5 w-5" />,
  trending: <TrendingUp className="h-5 w-5" />,
  hot: <Flame className="h-5 w-5" />,
};

export function ProductShowcaseSection({
  title,
  subtitle,
  products,
  viewAllLink = "/shop",
  icon = "new",
  maxProducts = 4,
}: ProductShowcaseSectionProps) {
  const displayProducts = products.slice(0, maxProducts);

  if (displayProducts.length === 0) return null;

  return (
    <section className="py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              {icons[icon]}
              <span className="text-xs font-semibold uppercase tracking-wider">
                {icon === "new" ? "Just In" : icon === "trending" ? "Popular Now" : "Hot Picks"}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          <Link
            href={viewAllLink}
            className="hidden sm:flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-black transition-colors"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {displayProducts.map((product) => (
            <UnifiedProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              image={product.images?.[0] ?? "/file.svg"}
              price={getProductPrice(product).sale}
              oldPrice={getProductPrice(product).compareAt}
              bestseller={product.bestseller}
              badge={product.badge}
              discountPercent={product.discountPercent}
              stock={product.stock}
              variants={product.variants}
              
              category={product.category}
              rating={product.rating}
              colors={product.colors}
              slug={product.slug}
            />
          ))}
        </div>

        {/* Mobile View All */}
        <Link
          href={viewAllLink}
          className="sm:hidden mt-6 flex items-center justify-center gap-1 w-full py-3 border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

// Utility functions to filter products for different sections
export function getNewArrivals(products: Product[], limit = 8): Product[] {
  // Sort by ID - assuming newer products have higher/later IDs
  return [...products]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, limit);
}

export function getBestSellers(products: Product[], limit = 8): Product[] {
  // Only products explicitly tagged as bestseller by admin
  return [...products]
    .filter((p) => p.bestseller)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function getOnSale(products: Product[], limit = 8): Product[] {
  return [...products]
    .filter((p) => {
      const { sale, compareAt } = getProductPrice(p);
      return compareAt > sale;
    })
    .sort((a, b) => {
      const { sale: saleA, compareAt: compareAtA } = getProductPrice(a);
      const { sale: saleB, compareAt: compareAtB } = getProductPrice(b);
      const discountA = ((compareAtA - saleA) / compareAtA) * 100;
      const discountB = ((compareAtB - saleB) / compareAtB) * 100;
      return discountB - discountA;
    })
    .slice(0, limit);
}
