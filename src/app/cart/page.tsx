"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { getProductPrice, useCommerceStore } from "../lib/store";
import { formatCurrency } from "../lib/utils";

export default function CartPage() {
  const { cart, products, updateCartQuantity, removeFromCart } = useCommerceStore();

  const items = useMemo(() => {
    return cart
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const { sale } = getProductPrice(product);
        return {
          ...item,
          product,
          price: sale,
        };
      })
      .filter(Boolean);
  }, [cart, products]);

  const subtotal = items.reduce((sum, item) => sum + item!.price * item!.quantity, 0);

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[color:var(--background)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="rounded-2xl border border-gray-100 bg-white/90 p-8 text-center shadow-sm">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Cart</h1>
            <p className="text-sm text-gray-500 mt-2">Your cart is empty.</p>
            <Link
              href="/shop"
              className="inline-flex mt-6 rounded-full bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Your Cart</h1>
          <Link href="/shop" className="text-sm text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 rounded">
            Continue Shopping
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100 glass-card">
            {items.map((item) => (
              <div key={`${item!.productId}-${item!.color}-${item!.size}`} className="flex gap-4 p-5">
                <div className="relative w-20 h-24 rounded-lg bg-gray-50 overflow-hidden">
                  <Image
                    src={item!.product.images?.[0] ?? "/file.svg"}
                    alt={item!.product.name}
                    fill
                    sizes="80px"
                    quality={80}
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item!.product.name}</p>
                      <p className="text-xs text-gray-500">{item!.product.category}</p>
                    </div>
                    <button
                      className="text-xs text-red-600 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 rounded"
                      onClick={() => removeFromCart(item!)}
                      aria-label={`Remove ${item!.product.name}`}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-2 py-1">
                      <button
                        className="w-7 h-7 rounded-full hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                        onClick={() => updateCartQuantity(item!, Math.max(1, item!.quantity - 1))}
                        aria-label={`Decrease quantity of ${item!.product.name}`}
                      >
                        -
                      </button>
                      <span className="text-sm font-medium text-gray-900 w-6 text-center">{item!.quantity}</span>
                      <button
                        className="w-7 h-7 rounded-full hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                        onClick={() => updateCartQuantity(item!, item!.quantity + 1)}
                        aria-label={`Increase quantity of ${item!.product.name}`}
                      >
                        +
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item!.price * item!.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-gray-100 shadow-sm p-6 h-fit glass-card">
            <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium text-gray-900">Calculated at checkout</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
            </div>
            <Link
              href="/shipping"
              className="mt-6 w-full inline-flex justify-center rounded-full bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            >
              Add Shipping Details
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
