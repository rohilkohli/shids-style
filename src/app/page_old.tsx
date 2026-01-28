"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getProductPrice, useCommerceStore } from "./lib/store";
import { classNames, formatCurrency } from "./lib/utils";
import type { Product } from "./lib/types";

const categories = ["All", "Oversized Tees", "Summer Dresses", "Cargo & Denims", "Knitwear", "Accessories"];

type FilterState = {
  search: string;
  category: string;
};

const couponRates: Record<string, number> = {
  ELEVATE10: 0.1,
  VIP15: 0.15,
};

function ProductCard({
  product,
  wished,
  onWishlist,
  onAdd,
}: {
  product: Product;
  wished: boolean;
  onWishlist: (id: string) => void;
  onAdd: (product: Product) => void;
}) {
  const { sale, compareAt } = getProductPrice(product);
  const lowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div className="group relative bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="absolute top-3 right-3 z-10">
        <button
          className={classNames(
            "rounded-full w-10 h-10 flex items-center justify-center transition-colors",
            wished ? "bg-black text-white" : "bg-white/90 text-gray-700 hover:bg-black hover:text-white"
          )}
          onClick={() => onWishlist(product.id)}
        >
          {wished ? "♥" : "♡"}
        </button>
      </div>

      <Link href={`/products/${product.slug}`}>
        <div className="aspect-[3/4] overflow-hidden bg-gray-50">
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </div>
      </Link>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/products/${product.slug}`} className="flex-1">
            <h3 className="text-sm font-medium text-gray-900 hover:underline">{product.name}</h3>
          </Link>
        </div>
        
        <div className="text-sm text-gray-500">{product.category}</div>

        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-gray-900">{formatCurrency(sale)}</span>
          {compareAt !== sale && (
            <span className="text-sm text-gray-400 line-through">{formatCurrency(compareAt)}</span>
          )}
        </div>

        <button
          className="w-full rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-300"
          onClick={() => onAdd(product)}
          disabled={product.stock === 0}
        >
          {product.stock === 0 ? "Sold Out" : "Add to Bag"}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const {
    ready,
    products,
    cart,
    wishlist,
    wishlistItems,
    cartSummary,
    addToCart,
    toggleWishlist,
    updateCartQuantity,
    removeFromCart,
    createOrder,
  } = useCommerceStore();

  const [filters, setFilters] = useState<FilterState>({ search: "", category: "All" });
  const [coupon, setCoupon] = useState("");
  const [checkoutForm, setCheckoutForm] = useState({ email: "", address: "" });
  const [orderMessage, setOrderMessage] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.tags.some((tag) => tag.toLowerCase().includes(filters.search.toLowerCase()));
      const matchesCategory = filters.category === "All" || product.category === filters.category;
      return matchesSearch && matchesCategory;
    });
  }, [products, filters]);

  const couponRate = couponRates[coupon.trim().toUpperCase()] ?? 0;
  const discountAmount = cartSummary.subtotal * couponRate;
  const total = cartSummary.subtotal - discountAmount;

  const handleCheckout = () => {
    setOrderMessage(null);
    const order = createOrder({
      email: checkoutForm.email || "guest@shids.style",
      address: checkoutForm.address || "Digital checkout",
      notes: couponRate ? `Coupon ${coupon.trim().toUpperCase()}` : undefined,
    });

    if (order) {
      setCheckoutForm({ email: "", address: "" });
      setCoupon("");
      setOrderMessage(`Order ${order.id} placed. We will update status soon.`);
    } else {
      setOrderMessage("Add items to cart before checkout.");
    }
  };

  if (!ready) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center text-lg font-semibold text-zinc-200">
          Booting SHIDS STYLE experience...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 text-gray-800">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white/80 px-5 py-4 backdrop-blur-xl shadow-lg shadow-pink-100/50 border border-pink-100 lg:px-7">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-pink-400 via-rose-400 to-purple-400 shadow-lg shadow-pink-200/50" />
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-pink-500 font-semibold">Shids Style</p>
              <h1 className="text-xl font-bold leading-tight bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">Elevate Your Style</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
            <div className="rounded-full bg-gradient-to-r from-pink-100 to-purple-100 border border-pink-200 px-4 py-2 shadow-sm">💝 Wishlist {wishlist.length}</div>
            <div className="rounded-full bg-gradient-to-r from-purple-100 to-rose-100 border border-purple-200 px-4 py-2 shadow-sm">🛍️ Cart {cart.length}</div>
          </div>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden rounded-[2rem] border-2 border-pink-200 bg-gradient-to-br from-white via-pink-50 to-purple-50 p-8 shadow-2xl shadow-pink-200/30">
            <div className="absolute inset-0 grid-accent opacity-40" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 font-medium">
                <span className="rounded-full bg-gradient-to-r from-pink-100 to-rose-100 border border-pink-200 px-3 py-1 uppercase tracking-[0.2em] shadow-sm">✨ New Season</span>
                <span className="rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 px-3 py-1 shadow-sm">ELEVATE YOUR STYLE</span>
                <span className="rounded-full bg-gradient-to-r from-rose-100 to-pink-100 border border-rose-200 px-3 py-1 shadow-sm">Mobile-first • Chic</span>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-pink-500 font-semibold">SHIDS STYLE</p>
                <h2 className="mt-3 text-4xl font-bold leading-tight text-gray-800 sm:text-5xl">
                  Modern silhouettes crafted for city movement.
                </h2>
                <p className="mt-4 max-w-2xl text-lg text-gray-600 leading-relaxed">
                  Discover layering essentials, technical outerwear, and everyday staples with smart stock tracking,
                  wishlist-ready picks, and seamless checkout.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="#products" className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 text-sm font-bold text-white transition hover:scale-105 hover:shadow-lg shadow-pink-300/50">Shop the edit ✨</Link>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 sm:text-base">
                <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-white border-2 border-pink-100 p-4 shadow-sm">
                  <p className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">24</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-pink-400 font-semibold">New arrivals</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-white border-2 border-purple-100 p-4 shadow-sm">
                  <p className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">Fast</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-purple-400 font-semibold">Mobile-first</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-white border-2 border-rose-100 p-4 shadow-sm">
                  <p className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">Live</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-rose-400 font-semibold">Stock tracked</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass relative h-full overflow-hidden rounded-[2rem] border-2 border-purple-200 p-6 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-b from-pink-50/50 via-transparent to-purple-50/50" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 font-medium">✨ Live drop</p>
                <span className="rounded-full bg-gradient-to-r from-emerald-100 to-green-100 border border-emerald-200 px-3 py-1 text-xs text-emerald-600 font-semibold shadow-sm">In stock</span>
              </div>
              <h3 className="mt-2 text-2xl font-bold text-gray-800">Aero Loft Puffer</h3>
              <p className="mt-2 text-sm text-gray-600">
                Lightweight warmth with sealed seams and a matte finish. Built for cold city nights.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 text-sm font-bold text-white shadow-md">{formatCurrency(getProductPrice(products[0]).sale)}</span>
                <span className="text-sm text-gray-500 font-medium">Ships free • 2 colors</span>
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => addToCart({ productId: products[0].id, quantity: 1 })}
                  className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2.5 text-sm font-bold text-white transition hover:scale-105 shadow-md hover:shadow-lg"
                >
                  Quick add ✨
                </button>
                <Link href={`/products/${products[0].slug}`} className="rounded-full border-2 border-pink-300 px-5 py-2.5 text-sm font-bold text-pink-600 hover:bg-pink-50 transition">
                  View details
                </Link>
              </div>
            </div>
            <div className="relative mt-6 overflow-hidden rounded-2xl border-2 border-pink-200 shadow-lg">
              <img
                src={products[0].images[0]}
                alt="Aero Loft Puffer"
                className="h-56 w-full object-cover"
              />
            </div>
          </div>
        </section>

        <section id="products" className="mt-12 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-pink-500 font-semibold">✨ Catalog</p>
              <h3 className="text-2xl font-bold text-gray-800">Curated picks, tuned for mobile</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="w-48 rounded-full border-2 border-pink-200 bg-white px-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-pink-400 focus:outline-none shadow-sm"
                placeholder="🔍 Search products"
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              />
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={classNames(
                      "rounded-full px-3 py-2 text-xs font-bold transition shadow-sm",
                      filters.category === category
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md"
                        : "bg-white border-2 border-pink-200 text-gray-700 hover:border-pink-300 hover:bg-pink-50"
                    )}
                    onClick={() => setFilters((prev) => ({ ...prev, category }))}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                wished={wishlist.includes(product.id)}
                onWishlist={toggleWishlist}
                onAdd={(p) => addToCart({ productId: p.id, quantity: 1 })}
              />
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-4 lg:grid-cols-3">
          <div className="glass col-span-2 flex flex-col gap-4 rounded-3xl border-2 border-pink-200 p-6 bg-white/90 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-pink-500 font-semibold">💝 Wishlist</p>
                <h4 className="text-xl font-bold text-gray-800">Saved looks</h4>
              </div>
              <span className="rounded-full bg-gradient-to-r from-pink-100 to-purple-100 border border-pink-200 px-3 py-1 text-xs text-gray-700 font-bold shadow-sm">{wishlistItems.length} items</span>
            </div>
            {wishlistItems.length === 0 ? (
              <p className="text-sm text-gray-500">Wishlist something you love to keep it close. 💖</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {wishlistItems.map((product) => {
                  const { sale } = getProductPrice(product);
                  return (
                  <div key={product.id} className="flex items-center gap-4 rounded-2xl border-2 border-pink-100 bg-gradient-to-r from-white to-pink-50 p-4 shadow-sm hover:shadow-md transition">
                    <img src={product.images[0]} alt={product.name} className="h-16 w-16 rounded-xl object-cover border-2 border-pink-200 shadow-sm" />
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.category}</p>
                      <p className="text-sm font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">{formatCurrency(sale)}</p>
                    </div>
                    <button
                      onClick={() => addToCart({ productId: product.id, quantity: 1 })}
                      className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg hover:scale-105 transition"
                    >
                      Add ✨
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

            <div className="glass rounded-3xl border-2 border-purple-200 p-6 bg-white/90 shadow-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-purple-500 font-semibold">✨ Service</p>
            <h4 className="mt-2 text-xl font-bold text-gray-800">Premium perks</h4>
            <ul className="mt-4 space-y-3 text-sm text-gray-600 font-medium">
              <li>💖 Express mobile checkout</li>
              <li>🚚 Free India shipping on select carts</li>
              <li>📦 Live order status updates</li>
              <li>💳 UPI / cards / netbanking ready</li>
            </ul>
          </div>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass rounded-3xl border-2 border-pink-200 p-6 bg-white/90 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-pink-500 font-semibold">🛍️ Cart</p>
                <h4 className="text-xl font-bold text-gray-800">Bag & quick checkout</h4>
              </div>
              <span className="rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 px-3 py-1 text-xs text-gray-700 font-bold shadow-sm">{cart.length} items</span>
            </div>
            <div className="mt-4 space-y-4">
              {cart.length === 0 ? (
                <p className="text-sm text-gray-500">Your cart is empty. Add a piece to unlock checkout. 🛒</p>
              ) : (
                cart.map((item) => {
                  const product = products.find((p) => p.id === item.productId);
                  if (!product) return null;
                  const { sale } = getProductPrice(product);
                  const variantKey = `${item.productId}-${item.color ?? "any"}-${item.size ?? "any"}`;
                  return (
                  <div key={variantKey} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-purple-100 bg-gradient-to-r from-white to-purple-50 p-4 shadow-sm hover:shadow-md transition">
                    <img src={product.images[0]} alt={product.name} className="h-16 w-16 rounded-xl object-cover border-2 border-purple-200 shadow-sm" />
                    <div className="flex-1 min-w-[160px]">
                      <p className="font-bold text-gray-800">{product.name}</p>
                      <p className="text-xs text-gray-500">{item.size ?? "Flexible fit"} • {item.color ?? "Any"}</p>
                      <p className="text-sm font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">{formatCurrency(sale)}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <button
                          className="h-8 w-8 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 border-2 border-pink-200 text-gray-700 font-bold hover:scale-110 transition shadow-sm"
                          onClick={() => updateCartQuantity(item, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-bold text-gray-800">{item.quantity}</span>
                        <button
                          className="h-8 w-8 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 border-2 border-pink-200 text-gray-700 font-bold hover:scale-110 transition shadow-sm"
                          onClick={() => updateCartQuantity(item, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="text-xs text-gray-500 hover:text-pink-500 underline font-medium"
                        onClick={() => removeFromCart(item)}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="glass flex flex-col gap-4 rounded-3xl border-2 border-purple-200 p-6 bg-white/90 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-purple-500 font-semibold">💜 Checkout</p>
                <h4 className="text-xl font-bold text-gray-800">Secure payment</h4>
              </div>
              <span className="rounded-full bg-gradient-to-r from-emerald-100 to-green-100 border border-emerald-200 px-3 py-1 text-xs text-emerald-600 font-bold shadow-sm">Real-time</span>
            </div>

            <label className="text-sm text-gray-700 font-medium">
              Email 📧
              <input
                className="mt-1 w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-pink-400 focus:outline-none shadow-sm"
                placeholder="you@example.com"
                value={checkoutForm.email}
                onChange={(event) => setCheckoutForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>
            <label className="text-sm text-gray-700 font-medium">
              Shipping / pickup 📦
              <input
                className="mt-1 w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-pink-400 focus:outline-none shadow-sm"
                placeholder="Address in India or pickup note"
                value={checkoutForm.address}
                onChange={(event) => setCheckoutForm((prev) => ({ ...prev, address: event.target.value }))}
              />
            </label>
            <label className="text-sm text-gray-700 font-medium">
              Discount code 🎀
              <input
                className="mt-1 w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-pink-400 focus:outline-none shadow-sm"
                placeholder="ELEVATE10 or VIP15"
                value={coupon}
                onChange={(event) => setCoupon(event.target.value)}
              />
            </label>

            <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-200 p-4 text-sm text-gray-700 font-medium shadow-inner">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold">{cartSummary.formatted}</span>
              </div>
              <div className="mt-2 flex justify-between text-emerald-600">
                <span>Discount 🎁</span>
                <span className="font-bold">{discountAmount > 0 ? `- ${formatCurrency(discountAmount)}` : "Apply a code"}</span>
              </div>
              <div className="mt-3 flex justify-between text-lg font-bold text-gray-800">
                <span>Total</span>
                <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">{formatCurrency(Math.max(0, total))}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-3 text-sm font-bold text-white transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg hover:shadow-xl"
              disabled={!cart.length}
            >
              Place order ✨💝
            </button>
            {orderMessage && <p className="text-sm text-emerald-600 font-medium">🎉 {orderMessage}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
