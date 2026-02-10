"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getProductPrice, useCommerceStore } from "../lib/store";
import { formatCurrency } from "../lib/utils";
import CartDrawer from "../components/CartDrawer";
import { Breadcrumbs, breadcrumbConfigs } from "../components/Breadcrumbs";

export default function ShippingPage() {
  const router = useRouter();
  const { cart, products, user, discountCodes, updateUser } = useCommerceStore();
  const [form, setForm] = useState<{
    fullName: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }>(() => {
    const base = {
      fullName: null,
      email: null,
      phone: null,
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    };
    if (typeof window === "undefined") return base;
    const stored = window.localStorage.getItem("shids-style/shipping");
    if (!stored) return base;
    try {
      const parsed = JSON.parse(stored) as { email?: string; phone?: string; name?: string; address?: string };
      return {
        ...base,
        fullName: parsed.name ?? null,
        email: parsed.email ?? null,
        phone: parsed.phone ?? null,
      };
    } catch {
      return base;
    }
  });
  const [message, setMessage] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const readStoredDiscount = () => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem("shids-style/discount");
    if (!stored) return null;
    try {
      return JSON.parse(stored) as { code: string; type: "percentage" | "fixed"; value: number };
    } catch {
      return null;
    }
  };

  const [discountInput, setDiscountInput] = useState(() => readStoredDiscount()?.code ?? "");
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    type: "percentage" | "fixed";
    value: number;
  } | null>(() => readStoredDiscount());

  const resolvedForm = {
    ...form,
    fullName: form.fullName ?? user?.name ?? "",
    email: form.email ?? user?.email ?? "",
    phone: form.phone ?? user?.phone ?? "",
    addressLine1: form.addressLine1 || user?.addressLine1 || "",
    addressLine2: form.addressLine2 || user?.addressLine2 || "",
    city: form.city || user?.city || "",
    state: form.state || user?.state || "",
    postalCode: form.postalCode || user?.postalCode || "",
    country: form.country || user?.country || "",
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return sum;
      const { sale } = getProductPrice(product);
      return sum + sale * item.quantity;
    }, 0);
  }, [cart, products]);

  const discountAmount = useMemo(() => {
    if (!appliedDiscount) return 0;
    const raw = appliedDiscount.type === "percentage"
      ? (subtotal * (appliedDiscount.value / 100))
      : appliedDiscount.value;
    return Math.max(0, Math.min(raw, subtotal));
  }, [appliedDiscount, subtotal]);

  const shippingEstimate = subtotal >= 999 ? 0 : 99;
  const estimatedTotal = subtotal - discountAmount + shippingEstimate;

  const handleSubmit = async () => {
    setMessage(null);
    if (!resolvedForm.email.trim() || !resolvedForm.phone.trim()) {
      setMessage("Email and contact number are required.");
      return;
    }
    if (!resolvedForm.addressLine1.trim() || !resolvedForm.city.trim() || !resolvedForm.state.trim() || !resolvedForm.postalCode.trim()) {
      setMessage("Please fill in all required address fields.");
      return;
    }

    const fullAddress = [
      resolvedForm.addressLine1,
      resolvedForm.addressLine2,
      `${resolvedForm.city}, ${resolvedForm.state}`,
      resolvedForm.postalCode,
      resolvedForm.country || "India",
    ]
      .filter(Boolean)
      .join(", ");

    window.localStorage.setItem(
      "shids-style/shipping",
      JSON.stringify({
        email: resolvedForm.email.trim(),
        phone: resolvedForm.phone.trim(),
        name: resolvedForm.fullName.trim() || "Guest",
        address: fullAddress,
      })
    );

    if (appliedDiscount) {
      window.localStorage.setItem("shids-style/discount", JSON.stringify(appliedDiscount));
    } else {
      window.localStorage.removeItem("shids-style/discount");
    }

    if (user) {
      try {
        await updateUser({
          addressLine1: resolvedForm.addressLine1,
          addressLine2: resolvedForm.addressLine2,
          city: resolvedForm.city,
          state: resolvedForm.state,
          postalCode: resolvedForm.postalCode,
          country: resolvedForm.country || "India",
        });
      } catch (error) {
        console.warn("Failed to save address", error);
      }
    }

    router.push("/payment");
  };

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-[color:var(--background)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="rounded-2xl border border-gray-100 bg-white/90 p-8 text-center shadow-sm">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shipping Details</h1>
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
    <main className="min-h-screen bg-[color:var(--background)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Breadcrumbs items={breadcrumbConfigs.shipping} className="mb-6" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shipping Details</h1>
            <p className="text-xs sm:text-sm text-gray-500">Step 1 of 2</p>
          </div>
          <div className="text-xs text-gray-500">
            Free shipping over {formatCurrency(999)}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-black text-white px-3 py-1">Shipping</span>
          <span className="h-px w-6 bg-gray-200" />
          <span className="rounded-full border border-gray-200 px-3 py-1">Payment</span>
        </div>

        <div className="mt-6 sm:mt-8 grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <form
            className="rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-6 glass-card"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Contact</h2>
              <p className="text-xs text-gray-500">We will send updates about your order here.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                Full Name
                <input
                  autoComplete="name"
                  placeholder="Rahul Sharma"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                    value={resolvedForm.fullName}
                  onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@email.com"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                    value={resolvedForm.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </label>
              <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                Contact Number <span className="text-red-500">*</span>
                <input
                  type="tel"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                    value={resolvedForm.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </label>
            </div>

            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Shipping Address</h2>
              <p className="text-xs text-gray-500">Enter the address where you want your order delivered.</p>
            </div>

            <label className="text-sm font-medium text-gray-700">
              Address Line 1 <span className="text-red-500">*</span>
              <input
                required
                autoComplete="address-line1"
                placeholder="House No, Street, Area"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                value={resolvedForm.addressLine1}
                onChange={(e) => setForm((prev) => ({ ...prev, addressLine1: e.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Address Line 2
              <input
                autoComplete="address-line2"
                placeholder="Apartment, suite, landmark"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                value={resolvedForm.addressLine2}
                onChange={(e) => setForm((prev) => ({ ...prev, addressLine2: e.target.value }))}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                City <span className="text-red-500">*</span>
                <input
                  required
                  autoComplete="address-level2"
                  placeholder="Mumbai"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                  value={resolvedForm.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                State <span className="text-red-500">*</span>
                <input
                  required
                  autoComplete="address-level1"
                  placeholder="Maharashtra"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                  value={resolvedForm.state}
                  onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Postal Code <span className="text-red-500">*</span>
                <input
                  required
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="400001"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                  value={resolvedForm.postalCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Country
                <input
                  autoComplete="country-name"
                  placeholder="India"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                  value={resolvedForm.country}
                  onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                />
              </label>
            </div>

            {message && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" aria-live="polite">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-full btn-primary px-6 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            >
              Proceed to Payment
            </button>
          </form>

          <div className="rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6 h-fit glass-card space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
              <p className="text-xs text-gray-500">Review items before payment.</p>
            </div>

            <div className="space-y-3">
              {cart.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                if (!product) return null;
                const price = getProductPrice(product);
                return (
                  <div key={`${item.productId}-${item.color ?? ""}-${item.size ?? ""}`} className="flex gap-3">
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-white">
                      <Image
                        src={product.images?.[0] ?? "/file.svg"}
                        alt={product.name}
                        fill
                        sizes="64px"
                        quality={80}
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{product.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.color ? `Color: ${item.color}` : ""} {item.size ? `· Size: ${item.size}` : ""}
                      </p>
                      <p className="text-xs text-gray-600">Qty {item.quantity}</p>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(price.sale * item.quantity)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="font-medium text-gray-900">
                  {discountAmount > 0 ? `- ${formatCurrency(discountAmount)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium text-gray-900">
                  {shippingEstimate === 0 ? "Free" : formatCurrency(shippingEstimate)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">{formatCurrency(estimatedTotal)}</span>
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white/80 p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-700">Have a discount code?</p>
              <div className="flex gap-2">
                <input
                  value={discountInput}
                  onChange={(event) => setDiscountInput(event.target.value)}
                  placeholder="Enter code"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs uppercase tracking-wide focus:border-gray-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setDiscountMessage(null);
                    const code = discountInput.trim().toUpperCase();
                    if (!code) {
                      setAppliedDiscount(null);
                      return;
                    }
                    const match = discountCodes.find((discount) => discount.code.toUpperCase() === code && discount.isActive);
                    if (!match) {
                      setAppliedDiscount(null);
                      setDiscountMessage("Invalid or inactive code.");
                      return;
                    }
                    if (match.expiryDate && new Date(match.expiryDate) < new Date()) {
                      setAppliedDiscount(null);
                      setDiscountMessage("This code has expired.");
                      return;
                    }
                    if (match.maxUses && match.usedCount >= match.maxUses) {
                      setAppliedDiscount(null);
                      setDiscountMessage("This code has reached its limit.");
                      return;
                    }
                    setAppliedDiscount({ code: match.code, type: match.type, value: match.value });
                    setDiscountMessage(`Applied ${match.code}.`);
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Apply
                </button>
              </div>
              {discountMessage && (
                <p className="text-xs text-gray-600" aria-live="polite">{discountMessage}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <CartDrawer
        isOpen={showCart}
        onOpen={() => setShowCart(true)}
        onClose={() => setShowCart(false)}
        hideTrigger
      />
    </main>
  );
}
