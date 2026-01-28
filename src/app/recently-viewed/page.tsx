"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCommerceStore, getProductPrice } from "../lib/store";
import { formatCurrency } from "../lib/utils";
import type { Product } from "../lib/types";

export default function RecentlyViewedPage() {
  const { products, recentlyViewed, clearRecentlyViewed } = useCommerceStore();

  const items = useMemo(() => {
    return recentlyViewed
      .map((id) => products.find((product) => product.id === id))
      .filter((product): product is Product => Boolean(product));
  }, [recentlyViewed, products]);

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="py-10 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Recently Viewed</h1>
              <p className="text-sm text-gray-500">Your latest product views.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/shop" className="text-xs sm:text-sm text-gray-600 hover:text-gray-900">
                Continue Shopping
              </Link>
              {items.length > 0 && (
                <button
                  className="rounded-full border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-white"
                  onClick={() => clearRecentlyViewed()}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600">
              Nothing viewed yet. Explore the collection to see items here.
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((product) => {
                if (!product) return null;
                const { sale, compareAt } = getProductPrice(product);
                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:border-gray-200"
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-xl bg-gray-50">
                      <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-semibold text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.category}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-gray-900">{formatCurrency(sale)}</span>
                        {compareAt !== sale && <span className="text-xs text-gray-400 line-through">{formatCurrency(compareAt)}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
