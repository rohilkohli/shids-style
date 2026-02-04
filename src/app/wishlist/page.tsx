"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import CartDrawer from "../components/CartDrawer";
import { getProductPrice, useCommerceStore } from "../lib/store";
import { formatCurrency } from "../lib/utils";

export default function WishlistPage() {
  const { wishlistItems, addToCart } = useCommerceStore();
  const [showCart, setShowCart] = useState(false);

  const totalItems = useMemo(() => wishlistItems.length, [wishlistItems]);

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="py-10 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Wishlist</h1>
              <p className="text-sm text-gray-500">Saved items: {totalItems}</p>
            </div>
            <Link
              href="/shop"
              className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 rounded"
            >
              Continue Shopping
            </Link>
          </div>

          {wishlistItems.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600">
              <p>Your wishlist is empty. Save items to shop later.</p>
              <Link
                href="/shop"
                className="mt-4 inline-flex rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                Browse Collection
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {wishlistItems.map((product) => {
                const { sale, compareAt } = getProductPrice(product);
                return (
                  <div key={product.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-gray-200 hover:shadow-md">
                    <Link href={`/products/${product.slug}`}>
                      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-gray-50 relative">
                        <Image
                          src={product.images?.[0] ?? "/file.svg"}
                          alt={product.name}
                          fill
                          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                          quality={80}
                          className="object-cover"
                        />
                      </div>
                    </Link>
                    <div className="mt-4 space-y-2">
                      <Link href={`/products/${product.slug}`} className="text-sm font-semibold text-gray-900 hover:underline">
                        {product.name}
                      </Link>
                      <div className="text-xs text-gray-500">{product.category}</div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-gray-900">{formatCurrency(sale)}</span>
                        {compareAt !== sale && <span className="text-xs text-gray-400 line-through">{formatCurrency(compareAt)}</span>}
                      </div>
                      <button
                        className="w-full rounded-full btn-primary px-4 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                        onClick={() => {
                          addToCart({ productId: product.id, quantity: 1 });
                          setShowCart(true);
                        }}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <CartDrawer
        isOpen={showCart}
        onOpen={() => setShowCart(true)}
        onClose={() => setShowCart(false)}
        hideTrigger
      />
    </main>
  );
}
