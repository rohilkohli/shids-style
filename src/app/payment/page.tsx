"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getProductPrice, useCommerceStore } from "../lib/store";
import { formatCurrency } from "../lib/utils";

const PAYMENT_WINDOW_SECONDS = 300;
const FREE_SHIPPING_THRESHOLD = 999;
const SHIPPING_FEE = 99;

export default function PaymentPage() {
  const router = useRouter();
  const { cart, products, createOrder } = useCommerceStore();
  const [secondsLeft, setSecondsLeft] = useState(PAYMENT_WINDOW_SECONDS);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shippingInfo, setShippingInfo] = useState<{
    email: string;
    phone: string;
    name: string;
    address: string;
  } | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("shids-style/shipping");
    if (stored) {
      try {
        setShippingInfo(JSON.parse(stored));
      } catch {
        setShippingInfo(null);
      }
    }
  }, []);

  useEffect(() => {
    if (expired) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [expired]);

  useEffect(() => {
    if (!expired) return;
    const timeout = setTimeout(() => {
      router.push("/shipping");
    }, 2200);
    return () => clearTimeout(timeout);
  }, [secondsLeft, expired, router]);

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

  const shippingFee = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const totalAmount = subtotal + shippingFee;
  const txnRef = `SHIDS-${Date.now()}`;
  const upiLink = `upi://pay?pa=shids@upi&pn=SHIDS%20STYLE&mc=&tid=${txnRef}&tr=${txnRef}&tn=Payment%20for%20SHIDS%20STYLE&am=${totalAmount.toFixed(2)}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLink)}`;

  const handleConfirm = async () => {
    setMessage(null);
    if (secondsLeft <= 0) {
      setMessage("Order not placed. Payment window expired.");
      return;
    }
    if (!receipt || !receiptDataUrl) {
      setMessage("Please upload payment screenshot.");
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
        paymentProof: receiptDataUrl,
        shippingFee,
      });

      if (order) {
        window.localStorage.setItem("shids-style/last-order", JSON.stringify(order));
        window.localStorage.removeItem("shids-style/shipping");
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

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-[color:var(--background)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-3xl font-bold text-gray-900">Payment</h1>
          <p className="text-sm text-gray-500 mt-2">Your cart is empty.</p>
          <Link
            href="/shop"
            className="inline-flex mt-6 rounded-full bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Shop Products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)] relative">
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="rounded-full border border-gray-200 px-3 py-1">Shipping</span>
            <span className="h-px w-6 bg-gray-200" />
            <span className="rounded-full bg-black text-white px-3 py-1">Payment</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
            <div className="rounded-3xl border border-gray-100 p-6 sm:p-8 glass-card space-y-6">
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
                    Upload proof before timer ends
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-black transition-all"
                    style={{
                      width: `${Math.max(0, (secondsLeft / PAYMENT_WINDOW_SECONDS) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white/80 p-5 text-center space-y-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Scan & Pay</p>
                  <img
                    src={qrCodeUrl}
                    alt="UPI QR Code"
                    className="mx-auto h-36 w-36 rounded-xl border border-gray-200 bg-white"
                  />
                  <p className="text-xs text-gray-500">Scan with Google Pay, PhonePe, Paytm, or any UPI app.</p>
                  <div className="mx-auto h-12 w-40 overflow-hidden sm:h-14 sm:w-48">
                    <img
                      src="/payment-gw.png"
                      alt="Supported payment apps"
                      className="h-full w-full object-cover opacity-90"
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white/80 p-5 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Pay via UPI ID</p>
                    <p className="text-base font-semibold text-gray-900">shids@upi</p>
                    <p className="text-xs text-gray-500">Reference: {txnRef}</p>
                  </div>
                  <a
                    href={upiLink}
                    className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    Open UPI Apps
                  </a>
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:border-black"
                    onClick={async () => {
                      if (!navigator.clipboard) return;
                      await navigator.clipboard.writeText("shids@upi");
                      setMessage("UPI ID copied to clipboard.");
                      setTimeout(() => setMessage(null), 1600);
                    }}
                  >
                    Copy UPI ID
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-gray-300 bg-white/80 p-5">
                <label className="text-sm font-medium text-gray-700">Upload Payment Screenshot</label>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    id="payment-receipt"
                    type="file"
                    accept="image/*"
                    className="flex-1 min-w-[220px] rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-gray-400 focus:outline-none"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setReceipt(file);
                      if (!file) {
                        setReceiptDataUrl(null);
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        setReceiptDataUrl(typeof reader.result === "string" ? reader.result : null);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label
                    htmlFor="payment-receipt"
                    className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-black px-5 py-2 text-xs font-medium text-white transition hover:-translate-y-0.5 hover:bg-gray-900 hover:shadow-md active:translate-y-0"
                  >
                    <span>Upload</span>
                    <svg
                      className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 16V4" />
                      <path d="M7 9l5-5 5 5" />
                      <path d="M4 20h16" />
                    </svg>
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Ensure the screenshot shows UPI ID, amount, and reference ID.
                </p>
                {receiptDataUrl && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <img src={receiptDataUrl} alt="Payment proof" className="h-40 w-full object-cover" />
                  </div>
                )}
              </div>

              {message && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  {message}
                </div>
              )}

              <button
                onClick={handleConfirm}
                className="w-full rounded-full btn-primary px-6 py-3 text-sm font-medium transition disabled:opacity-70"
                disabled={submitting}
              >
                {submitting ? "Confirming..." : "Confirm Payment"}
              </button>
            </div>

            <div className="space-y-6">
              {shippingInfo ? (
                <div className="rounded-3xl border border-gray-100 p-6 sm:p-7 glass-card">
                  <h3 className="text-sm font-semibold text-gray-900">Shipping Details</h3>
                  <div className="mt-3 text-xs text-gray-600 space-y-1">
                    <p className="font-semibold text-gray-900">{shippingInfo.name}</p>
                    <p>{shippingInfo.email}</p>
                    <p>{shippingInfo.phone}</p>
                    <p>{shippingInfo.address}</p>
                  </div>
                  <Link
                    href="/shipping"
                    className="mt-4 inline-flex text-xs font-semibold text-gray-700 hover:text-black"
                  >
                    Edit shipping details
                  </Link>
                </div>
              ) : (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-xs text-amber-700">
                  Shipping details missing. Please go back to Shipping.
                  <Link href="/shipping" className="ml-2 font-semibold underline">
                    Go now
                  </Link>
                </div>
              )}

              <div className="rounded-3xl border border-gray-100 p-6 sm:p-8 glass-card">
                <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
                <div className="mt-4 space-y-3">
                  {cart.map((item) => {
                    const product = products.find((p) => p.id === item.productId);
                    if (!product) return null;
                    const price = getProductPrice(product);
                    return (
                      <div key={`${item.productId}-${item.color ?? ""}-${item.size ?? ""}`} className="flex gap-3 text-sm">
                        <div className="h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-white">
                          <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-900 line-clamp-1">{product.name}</p>
                          <p className="text-[10px] text-gray-500">
                            {item.color ? `Color: ${item.color}` : ""} {item.size ? `· Size: ${item.size}` : ""}
                          </p>
                          <p className="text-[10px] text-gray-500">Qty {item.quantity}</p>
                        </div>
                        <div className="text-xs font-semibold text-gray-900">
                          {formatCurrency(price.sale * item.quantity)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium text-gray-900">
                      {shippingFee === 0 ? "Free" : formatCurrency(shippingFee)}
                    </span>
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
                  <li>• Upload a clear screenshot to confirm.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {expired && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white/95 p-6 text-center shadow-xl animate-[fadeInUp_0.5s_ease]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
