"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { getProductPrice, useCommerceStore } from "../lib/store";
import { formatCurrency } from "../lib/utils";
import type { Order } from "../lib/types";

export default function OrderConfirmationPage() {
  const { products } = useCommerceStore();
  const [order] = useState<Order | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem("shids-style/last-order");
    if (!stored) return null;
    try {
      return JSON.parse(stored) as Order;
    } catch {
      return null;
    }
  });
  const [copied, setCopied] = useState(false);

  const customerName = useMemo(() => {
    if (!order?.notes) return "";
    const match = order.notes.match(/Name:\s*([^|]+)/i);
    return match?.[1]?.trim() ?? "";
  }, [order]);

  const customerPhone = useMemo(() => {
    if (!order?.notes) return "";
    const match = order.notes.match(/Phone:\s*([^|]+)/i);
    return match?.[1]?.trim() ?? "";
  }, [order]);

  const items = useMemo(() => {
    if (!order) return [];
    return order.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const price = product ? getProductPrice(product).sale : 0;
      return { item, product, price };
    });
  }, [order, products]);

  const computedSubtotal = useMemo(() => {
    if (!order) return 0;
    if (typeof order.subtotal === "number") return order.subtotal;
    return items.reduce((sum, entry) => sum + entry.price * entry.item.quantity, 0);
  }, [order, items]);

  const shippingFee = typeof order?.shippingFee === "number" ? order.shippingFee : 0;
  const computedTotal = computedSubtotal + shippingFee;

  if (!order) {
    return (
      <main className="min-h-screen bg-[color:var(--background)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Thank you</h1>
          <p className="mt-2 text-sm text-gray-500">We could not find your order details.</p>
          <Link
            href="/shop"
            className="inline-flex mt-6 rounded-full btn-primary px-6 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Thank you</p>
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900">Order Confirmed</h1>
            <p className="mt-2 text-sm text-gray-600">We have received your payment proof.</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { title: "Order Placed", done: true },
              { title: "Payment Verification", done: order.paymentVerified },
              { title: "Shipped", done: order.status === "shipped" },
            ].map((step) => (
              <div key={step.title} className="rounded-2xl border border-gray-100 bg-white p-4 text-center">
                <div className={`mx-auto mb-2 h-8 w-8 rounded-full flex items-center justify-center ${
                  step.done ? "bg-black text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {step.done ? "✓" : "•"}
                </div>
                <p className="text-xs font-semibold text-gray-900">{step.title}</p>
                <p className="mt-1 text-xs text-gray-500">{step.done ? "Completed" : "Pending"}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Order ID</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{order.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                    Status: {order.status}
                  </span>
                  <button
                    type="button"
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                    onClick={async () => {
                      if (!navigator.clipboard) return;
                      await navigator.clipboard.writeText(order.id);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? "Copied" : "Copy ID"}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                <p className="font-medium text-gray-900">Shipping Address</p>
                {customerName && <p className="mt-1">{customerName}</p>}
                {customerPhone && <p className="text-xs text-gray-600">{customerPhone}</p>}
                <p className="mt-2 text-sm text-gray-700">{order.address}</p>
                <p className="mt-2 text-xs text-gray-500">{order.email}</p>
              </div>

              <div>
                <h2 className="text-base font-semibold text-gray-900">Items Ordered</h2>
                <div className="mt-4 space-y-4">
                  {items.map(({ item, product, price }) => (
                    <div key={`${item.productId}-${item.size}-${item.color}`} className="flex gap-4">
                      <div className="relative h-20 w-16 overflow-hidden rounded-lg bg-gray-100">
                        {product?.images?.[0] ? (
                          <Image
                            src={product.images?.[0] ?? "/file.svg"}
                            alt={product.name}
                            fill
                            sizes="64px"
                            quality={80}
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-200" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{product?.name ?? item.productId}</p>
                        <p className="text-xs text-gray-500">
                          Qty: {item.quantity}
                          {item.size ? ` • Size: ${item.size}` : ""}
                          {item.color ? ` • ${item.color}` : ""}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm h-fit space-y-4">
              <h2 className="text-base font-semibold text-gray-900">Total Bill</h2>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(computedSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium text-gray-900">
                  {shippingFee === 0 ? "Free" : formatCurrency(shippingFee)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">{formatCurrency(computedTotal)}</span>
              </div>

              <p className="text-xs text-gray-500">
                We will update the order status once payment is verified.
              </p>

              <div className="grid gap-2">
                <Link
                  href={`/track?orderId=${encodeURIComponent(order.id)}&email=${encodeURIComponent(order.email)}`}
                  className="inline-flex w-full justify-center rounded-full btn-primary px-6 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                >
                  Track This Order
                </Link>
                <Link
                  href="/account"
                  className="inline-flex w-full justify-center rounded-full border border-gray-200 px-6 py-3 text-sm font-medium text-gray-700 hover:border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                >
                  View in Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
