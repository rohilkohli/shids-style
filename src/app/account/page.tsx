"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCommerceStore } from "../lib/store";
import { classNames, formatCurrency, formatDateTime } from "../lib/utils";
import CartDrawer from "../components/CartDrawer";
import { Breadcrumbs, breadcrumbConfigs } from "../components/Breadcrumbs";
import { AccountSkeleton } from "../components/Skeleton";

type Section = "overview" | "orders" | "profile";

type CancelRequest = Record<string, boolean>;

export default function AccountPage() {
  const { orders, user, ready, signOut, updateUser } = useCommerceStore();
  const [section, setSection] = useState<Section>("overview");
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cancelRequests, setCancelRequests] = useState<CancelRequest>({});
  const [showMenu, setShowMenu] = useState(false);
  const [addresses, setAddresses] = useState<Array<{ label: string; note: string }>>([]);
  const [addressForm, setAddressForm] = useState({ label: "Home", note: "" });
  const [showCart, setShowCart] = useState(false);

  const resolvedEmail = email ?? user?.email ?? "";
  const resolvedName = name ?? user?.name ?? "";
  const resolvedPhone = phone ?? user?.phone ?? "";

  const userOrders = useMemo(
    () => orders.filter((order) => order.email.toLowerCase() === resolvedEmail.toLowerCase()),
    [orders, resolvedEmail]
  );

  if (!ready) {
    return (
      <main className="min-h-screen bg-[color:var(--background)]">
        <AccountSkeleton />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sign in to view your account</h1>
          <p className="mt-2 text-sm text-gray-600">Log in to track orders and manage your profile.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="rounded-full bg-black px-6 py-3 text-sm font-medium !text-white hover:bg-gray-800">
              Go to Login
            </Link>
            <Link href="/shop" className="rounded-full border border-gray-900 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-white">
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <Breadcrumbs items={breadcrumbConfigs.account} className="mb-6" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5 sm:mb-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{name || user.name}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">Account</p>
            </div>
            <button
              className="sm:hidden h-11 w-11 flex items-center justify-center rounded-full border border-black/10 bg-white text-gray-900 shadow-sm transition hover:border-black/30 hover:shadow"
              onClick={() => setShowMenu(true)}
              aria-label="Open menu"
            >
              <span className="relative w-5 h-4">
                <span className="absolute left-0 top-0 h-0.5 w-5 bg-gray-900 rounded" />
                <span className="absolute left-0 top-2 h-0.5 w-5 bg-gray-900 rounded" />
                <span className="absolute left-0 top-4 h-0.5 w-5 bg-gray-900 rounded" />
              </span>
            </button>
          </div>
          <div className="hidden sm:flex flex-wrap items-center gap-2">
            <button
              className={classNames(
                "rounded-full px-4 py-2 text-xs font-semibold border transition",
                section === "overview" ? "bg-black text-white border-black" : "border-gray-200 text-gray-700 hover:border-black"
              )}
              aria-pressed={section === "overview"}
              onClick={() => setSection("overview")}
            >
              Overview
            </button>
            <button
              className={classNames(
                "rounded-full px-4 py-2 text-xs font-semibold border transition",
                section === "orders" ? "bg-black text-white border-black" : "border-gray-200 text-gray-700 hover:border-black"
              )}
              aria-pressed={section === "orders"}
              onClick={() => setSection("orders")}
            >
              Orders
            </button>
            <button
              className={classNames(
                "rounded-full px-4 py-2 text-xs font-semibold border transition",
                section === "profile" ? "bg-black text-white border-black" : "border-gray-200 text-gray-700 hover:border-black"
              )}
              aria-pressed={section === "profile"}
              onClick={() => setSection("profile")}
            >
              Manage Profile
            </button>
            <button
              className="rounded-full px-4 py-2 text-xs font-semibold border border-gray-200 text-gray-700 hover:border-black hover:text-black transition inline-flex items-center gap-2"
              onClick={() => signOut()}
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        {showMenu && (
          <div className="fixed inset-0 z-40 sm:hidden">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMenu(false)} />
            <aside className="absolute left-0 top-0 h-full w-[min(88vw,340px)] bg-white shadow-2xl border-r border-gray-200">
              <div className="flex items-center justify-between px-5 py-4 bg-[#0f2a23] text-white">
                <p className="text-base font-semibold">Menu</p>
                <button
                  className="h-9 w-9 flex items-center justify-center rounded-full border border-white/30 text-white/90 hover:bg-white/10"
                  onClick={() => setShowMenu(false)}
                  aria-label="Close menu"
                >
                  <span className="relative w-4 h-4">
                    <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 rotate-45 bg-white rounded" />
                    <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 -rotate-45 bg-white rounded" />
                  </span>
                </button>
              </div>
              <div className="px-5 py-4 text-sm">
                <button
                  className="w-full text-left py-3 font-semibold text-gray-900 border-b border-gray-200"
                  onClick={() => {
                    setSection("overview");
                    setShowMenu(false);
                  }}
                >
                  Overview
                </button>
                <button
                  className="w-full text-left py-3 font-semibold text-gray-900 border-b border-gray-200"
                  onClick={() => {
                    setSection("orders");
                    setShowMenu(false);
                  }}
                >
                  Orders
                </button>
                <button
                  className="w-full text-left py-3 font-semibold text-gray-900 border-b border-gray-200"
                  onClick={() => {
                    setSection("profile");
                    setShowMenu(false);
                  }}
                >
                  Manage Profile
                </button>
                <button
                  className="w-full text-left py-3 font-semibold text-gray-900 border-b border-gray-200 inline-flex items-center gap-2"
                  onClick={() => signOut()}
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                  Logout
                </button>
              </div>
            </aside>
          </div>
        )}

        <section className="rounded-2xl border border-gray-100 p-5 sm:p-6 glass-card" aria-live="polite">
            {section === "overview" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
                  <p className="text-sm text-gray-500">Manage your orders and profile details.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-100 p-4 bg-white/70">
                    <p className="text-xs uppercase tracking-wider text-gray-500">Signed In As</p>
                    <p className="text-sm font-medium text-gray-900 mt-2">{email || user.email}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-4 bg-white/70">
                    <p className="text-xs uppercase tracking-wider text-gray-500">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{userOrders.length}</p>
                  </div>
                </div>
              </div>
            )}

            {section === "orders" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Your Orders</h2>
                  <p className="text-sm text-gray-500">Track, manage, or request cancellation.</p>
                </div>
                <div className="rounded-xl border border-gray-100 p-4 bg-white/70">
                  <label className="text-sm font-medium text-gray-700">
                    Email
                       <input
                         className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                         value={resolvedEmail}
                         onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                </div>

                {userOrders.length === 0 ? (
                  <div className="rounded-xl border border-gray-100 p-6 text-sm text-gray-600 bg-white/70">
                    <p>No orders found for this email.</p>
                    <Link
                      href="/shop"
                      className="mt-4 inline-flex rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                    >
                      Shop Now
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userOrders.map((order) => (
                      <div key={order.id} className="rounded-xl border border-gray-100 p-5 bg-white/70">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Order #{order.id}</p>
                            <p className="text-xs text-gray-500">Placed {formatDateTime(order.createdAt)}</p>
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            {order.status}
                          </span>
                        </div>
                        <div className="mt-3 text-sm text-gray-600">Total: {formatCurrency(order.total)}</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href={`/track?orderId=${encodeURIComponent(order.id)}&email=${encodeURIComponent(resolvedEmail)}`}
                            className="rounded-full border border-gray-200 px-4 py-2 text-xs font-medium hover:bg-gray-50"
                          >
                            Track Order
                          </Link>
                          <button
                            className="rounded-full border border-gray-200 px-4 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                            onClick={() => {
                              setCancelRequests((prev) => ({ ...prev, [order.id]: true }));
                            }}
                            disabled={!!cancelRequests[order.id]}
                          >
                            {cancelRequests[order.id] ? "Cancellation Requested" : "Request Cancel"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section === "profile" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Manage Profile</h2>
                  <p className="text-sm text-gray-500">Update your personal details.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium text-gray-700">
                        Full Name
                        <input
                          className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                          value={resolvedName}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </label>
                  <label className="text-sm font-medium text-gray-700">
                    Email
                    <input
                      type="email"
                      className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                         value={resolvedEmail}
                         onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Phone
                    <input
                      className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                         value={resolvedPhone}
                         onChange={(e) => setPhone(e.target.value)}
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-gray-100 p-4 bg-white/70 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">Saved Addresses</p>
                  {addresses.length === 0 ? (
                    <p className="text-xs text-gray-500">No addresses saved yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {addresses.map((addr, index) => (
                        <div key={`${addr.label}-${index}`} className="flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{addr.label}</p>
                            <p className="text-xs text-gray-500">{addr.note}</p>
                          </div>
                          <button
                            className="text-xs text-red-600 hover:text-red-700"
                            onClick={() =>
                              setAddresses((prev) => prev.filter((_, idx) => idx !== index))
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-xs font-medium text-gray-700">
                      Label
                      <select
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                        value={addressForm.label}
                        onChange={(e) => setAddressForm((prev) => ({ ...prev, label: e.target.value }))}
                      >
                        <option value="Home">Home</option>
                        <option value="Office">Office</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                    <label className="text-xs font-medium text-gray-700 sm:col-span-2">
                      Address / Note
                      <input
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                        value={addressForm.note}
                        onChange={(e) => setAddressForm((prev) => ({ ...prev, note: e.target.value }))}
                      />
                    </label>
                  </div>
                  <button
                    className="rounded-full border border-gray-200 px-4 py-2 text-xs font-medium hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                    onClick={() => {
                      if (!addressForm.note.trim()) return;
                      setAddresses((prev) => [...prev, { ...addressForm }]);
                      setAddressForm({ label: "Home", note: "" });
                    }}
                  >
                    Add Address
                  </button>
                </div>

                {message && (
                  <div
                    className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
                    aria-live="polite"
                  >
                    {message}
                  </div>
                )}

                <button
                  className="rounded-full btn-primary px-6 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                  onClick={async () => {
                    try {
                      await updateUser({ name: resolvedName, email: resolvedEmail, phone: resolvedPhone });
                      setMessage("Profile updated successfully.");
                      setTimeout(() => setMessage(null), 2000);
                    } catch (error) {
                      setMessage((error as Error).message);
                    }
                  }}
                >
                  Save Changes
                </button>
              </div>
            )}
          </section>
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
