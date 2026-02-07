"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Order } from "../lib/types";
import { formatCurrency, formatDateTime } from "../lib/utils";

export default function TrackClient() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const autoTrackedRef = useRef(false);
  const formatStatus = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
  const formatOrderId = (value: string) => (value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-6)}` : value);

  const handleTrack = useCallback(async (nextOrderId?: string, nextEmail?: string) => {
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const resolvedOrderId = String(nextOrderId ?? orderId ?? "").trim().toLowerCase();
      const resolvedEmail = String(nextEmail ?? email ?? "").trim().toLowerCase();
      const response = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: resolvedOrderId, email: resolvedEmail }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Order not found.");
      }
      setOrder(json.data as Order);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [email, orderId]);

  useEffect(() => {
    const orderIdParam = searchParams.get("orderId") ?? "";
    const emailParam = searchParams.get("email") ?? "";
    if (orderIdParam || emailParam) {
      setOrderId(orderIdParam);
      setEmail(emailParam);
    }
    if (orderIdParam && emailParam && !autoTrackedRef.current) {
      autoTrackedRef.current = true;
      void handleTrack(orderIdParam, emailParam);
    }
  }, [handleTrack, searchParams]);

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-2xl border border-gray-100 bg-white/80 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Track Your Order</h1>
            <p className="text-sm text-gray-600">
              Enter your order ID and email to see real-time status updates.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Order ID
              <input
                className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                placeholder="ORD-XXXX"
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Email Address
              <input
                type="email"
                className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              onClick={() => handleTrack()}
              disabled={!orderId.trim() || !email.trim() || loading}
            >
              {loading ? "Checking..." : "Track Order"}
            </button>
            <Link
              href="/shop"
              className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
            >
              Continue Shopping
            </Link>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600" aria-live="polite">
              {error}
            </p>
          )}

          {order && (
            <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50/80 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Order #{formatOrderId(order.id)}</p>
                  <p className="text-xs text-gray-500">Placed {formatDateTime(order.createdAt)}</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-black text-white">
                  {formatStatus(order.status)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-5 text-sm">
                <div className="rounded-lg bg-white p-3 border border-gray-100">
                  <p className="text-xs uppercase tracking-wider text-gray-500">Total</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">{formatCurrency(order.total)}</p>
                </div>
                <div className="rounded-lg bg-white p-3 border border-gray-100">
                  <p className="text-xs uppercase tracking-wider text-gray-500">Status</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {formatStatus(order.status)}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 border border-gray-100">
                  <p className="text-xs uppercase tracking-wider text-gray-500">Payment</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {order.paymentVerified ? "Verified" : "Pending"}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 border border-gray-100">
                  <p className="text-xs uppercase tracking-wider text-gray-500">Courier</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">{order.courierName || "Not assigned"}</p>
                </div>
                <div className="rounded-lg bg-white p-3 border border-gray-100">
                  <p className="text-xs uppercase tracking-wider text-gray-500">AWB</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">{order.awbNumber || "Not assigned"}</p>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-700">
                <p className="font-semibold text-gray-900 mb-2">Shipping Address</p>
                <p>{order.address}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
