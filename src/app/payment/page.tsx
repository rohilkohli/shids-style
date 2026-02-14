"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getProductPrice, useCommerceStore } from "../lib/store";
import { formatCurrency } from "../lib/utils";
import { Breadcrumbs, breadcrumbConfigs } from "../components/Breadcrumbs";

const PAYMENT_WINDOW_SECONDS = 300;
const FREE_SHIPPING_THRESHOLD = 999;
const SHIPPING_FEE = 99;

// Generate order ID matching server format: SHIDS-XXXX
const generateOrderId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SHIDS-${suffix}`;
};

export default function PaymentPage() {
  const router = useRouter();
  const { cart, products, createOrder } = useCommerceStore();
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PAYMENT_WINDOW_SECONDS);
  const [message, setMessage] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [shippingInfo, setShippingInfo] = useState<{
    email: string;
    phone: string;
    name: string;
    address: string;
  } | null>(null);
  const [discountInfo, setDiscountInfo] = useState<{
    code: string;
    type: "percentage" | "fixed";
    value: number;
  } | null>(null);

  // Fix hydration: Only render store-dependent content after client mount
  useEffect(() => {
    requestAnimationFrame(() => setIsClientMounted(true));
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("shids-style/shipping");
    const discountStored = window.localStorage.getItem("shids-style/discount");
    requestAnimationFrame(() => {
      if (stored) {
        try {
          setShippingInfo(JSON.parse(stored));
        } catch {
          setShippingInfo(null);
        }
      }
      if (discountStored) {
        try {
          setDiscountInfo(JSON.parse(discountStored));
        } catch {
          setDiscountInfo(null);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (expired) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setExpired(true);
          setShowTimeoutModal(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [expired]);

  // Remove auto-redirect on timeout. Show modal instead.
  const handleExtendTimer = () => {
    setSecondsLeft(PAYMENT_WINDOW_SECONDS);
    setExpired(false);
    setShowTimeoutModal(false);
  };

  const handleRetryPayment = () => {
    setSecondsLeft(PAYMENT_WINDOW_SECONDS);
    setExpired(false);
    setShowTimeoutModal(false);
    setMessage(null);
  };

  const handleBackToShipping = () => {
    setShowTimeoutModal(false);
    router.push("/shipping");
  };

  useEffect(() => {
    requestAnimationFrame(() => setOrderId(generateOrderId()));
  }, []);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return sum;
      const { sale } = getProductPrice(product);
      return sum + sale * item.quantity;
    }, 0);
  }, [cart, products]);

  const formattedTimer = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = Math.max(0, secondsLeft % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [secondsLeft]);

  const discountAmount = useMemo(() => {
    if (!discountInfo) return 0;
    const raw = discountInfo.type === "percentage"
      ? (subtotal * (discountInfo.value / 100))
      : discountInfo.value;
    return Math.max(0, Math.min(raw, subtotal));
  }, [discountInfo, subtotal]);

  const shippingFee = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const totalAmount = subtotal - discountAmount + shippingFee;
  const resolvedOrderId = orderId ?? "SHIDS-XXXX";
  const upiLink = `upi://pay?pa=8810713286@ibl&pn=SHIDS%20STYLE&mc=&tid=${resolvedOrderId}&tr=${resolvedOrderId}&tn=Payment%20for%20SHIDS%20STYLE&am=${totalAmount.toFixed(2)}&cu=INR`;
  const qrCodeUrl = "/payment-qr.png";

  const handleConfirm = async () => {
    setMessage(null);
    if (secondsLeft <= 0) {
      setMessage("Order not placed. Payment window expired.");
      return;
    }
    if (!shippingInfo) {
      setMessage("Shipping details missing. Please fill shipping details.");
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder({
        email: shippingInfo.email,
        address: shippingInfo.address,
        notes: `Phone: ${shippingInfo.phone} | Name: ${shippingInfo.name}`,
        shippingFee,
        discountCode: discountInfo?.code,
        orderId: orderId ?? undefined,
      });

      if (order) {
        window.localStorage.setItem("shids-style/last-order", JSON.stringify(order));
        window.localStorage.removeItem("shids-style/shipping");
        window.localStorage.removeItem("shids-style/discount");

        // Save tracking token for guest orders
        if (order.trackingToken) {
          window.localStorage.setItem("shids-style/tracking-token", order.trackingToken);
        }

        router.push("/payment-processing");
      } else {
        setMessage("Order not placed. Cart is empty.");
      }
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Prevent hydration mismatch: wait for client mount before checking cart
  if (!isClientMounted) {
    return (
      <main className="min-h-screen bg-[color:var(--background)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="rounded-2xl border border-gray-100 bg-white/90 p-8 text-center shadow-sm">
            <div className="h-8 w-32 mx-auto bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-[color:var(--background)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="rounded-2xl border border-gray-100 bg-white/90 p-8 text-center shadow-sm">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payment</h1>
            <p className="text-sm text-gray-500 mt-2">Your cart is empty.</p>
            <Link
              href="/shop"
              className="inline-flex mt-6 rounded-full bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            >
              Shop Products
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)] relative">
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbConfigs.payment} className="mb-6" />
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="rounded-full border border-gray-200 px-3 py-1">Shipping</span>
            <span className="h-px w-6 bg-gray-200" />
            <span className="rounded-full bg-black text-white px-3 py-1">Payment</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
            <div className="rounded-3xl border border-gray-100 p-6 sm:p-8 glass-card space-y-6">
              {/* Payment column */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">UPI Payment</h1>
                  <p className="text-sm text-gray-500">Pay securely using any UPI app.</p>
                </div>
                <div className="rounded-full bg-black/90 px-4 py-2 text-xs font-medium text-white">
                  Amount: {formatCurrency(totalAmount)}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Time Remaining</p>
                    <p className="text-base font-semibold text-gray-900">{formattedTimer}</p>
                  </div>
                  <div className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600">
                    Complete payment before timer ends
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-black transition-all"
                    style={{ width: `${Math.max(0, (secondsLeft / PAYMENT_WINDOW_SECONDS) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white/80 p-5 text-center space-y-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Scan & Pay</p>
                  <Image
                    src={qrCodeUrl}
                    alt="UPI QR Code"
                    width={144}
                    height={144}
                    className="mx-auto h-36 w-36 rounded-xl border border-gray-200 bg-white"
                  />
                  <p className="text-xs text-gray-500">Scan with Google Pay, PhonePe, Paytm, or any UPI app.</p>
                  <div className="mx-auto h-12 w-40 overflow-hidden sm:h-14 sm:w-48">
                    <Image src="/payment-gw.png" alt="Supported payment apps" width={192} height={56} className="h-full w-full object-cover opacity-90" />
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white/80 p-5 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Pay via UPI ID</p>
                    <p className="text-base font-semibold text-gray-900">8810713286@ibl</p>
                    <p className="text-xs text-gray-500">Reference: {resolvedOrderId}</p>
                  </div>
                  <a href={upiLink} className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200">
                    Open UPI Apps
                  </a>
                  <button type="button" className="inline-flex w-full items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10" onClick={async () => {
                    if (!navigator.clipboard) return;
                    await navigator.clipboard.writeText("shids@upi");
                    setMessage("UPI ID copied to clipboard.");
                    setTimeout(() => setMessage(null), 1600);
                  }}>
                    Copy UPI ID
                  </button>
                </div>
              </div>

              {message && <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700" aria-live="polite">{message}</div>}

              <button onClick={handleConfirm} className="w-full rounded-full btn-primary px-6 py-3 text-sm font-medium transition disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20" disabled={submitting}>
                {submitting ? "Confirming..." : "Confirm Payment"}
              </button>
            </div>

            <aside className="space-y-6">
              {shippingInfo ? (
                <div className="rounded-3xl border border-gray-100 p-6 sm:p-7 glass-card">
                  <h3 className="text-sm font-semibold text-gray-900">Shipping Details</h3>
                  <div className="mt-3 text-xs text-gray-600 space-y-1">
                    <p className="font-semibold text-gray-900">{shippingInfo.name}</p>
                    <p>{shippingInfo.email}</p>
                    <p>{shippingInfo.phone}</p>
                    <p>{shippingInfo.address}</p>
                  </div>
                  <Link href="/shipping" className="mt-4 inline-flex text-xs font-semibold text-gray-700 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 rounded">Edit shipping details</Link>
                </div>
              ) : null}

              <div className="rounded-3xl border border-gray-100 p-6 sm:p-7 glass-card">
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-medium text-gray-900">{discountAmount > 0 ? `- ${formatCurrency(discountAmount)}` : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium text-gray-900">{shippingFee === 0 ? "Free" : formatCurrency(shippingFee)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-3 text-base">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-100 p-6 sm:p-7 glass-card">
                <h3 className="text-sm font-semibold text-gray-900">Payment Help</h3>
                <ul className="mt-3 space-y-2 text-xs text-gray-600">
                  <li>• Use the exact amount shown above.</li>
                  <li>• Keep the reference ID for tracking.</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {showTimeoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full text-center">
            <h2 className="text-lg font-bold mb-2 text-red-700">Payment Timed Out</h2>
            <p className="mb-4 text-gray-700">The payment window expired. Would you like to retry or go back?</p>
            <div className="flex flex-col gap-2">
              <button className="w-full rounded-full btn-primary px-4 py-2 font-medium" onClick={handleRetryPayment}>Retry Payment (New Timer)</button>
              <button className="w-full rounded-full bg-gray-200 px-4 py-2 font-medium text-gray-700" onClick={handleExtendTimer}>Extend Timer (+5 min)</button>
              <button className="w-full rounded-full bg-red-100 px-4 py-2 font-medium text-red-700" onClick={handleBackToShipping}>Back to Shipping</button>
            </div>
          </div>
        </div>
      )}

      {expired && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white/95 p-6 text-center shadow-xl animate-[fadeInUp_0.5s_ease]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v5" />
                <path d="M12 16h.01" />
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Sorry, payment timed out</h3>
            <p className="mt-2 text-sm text-gray-600">Redirecting you back to shipping details. Please try again.</p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div className="h-full w-full bg-red-500 animate-[shrink_2s_linear]" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
