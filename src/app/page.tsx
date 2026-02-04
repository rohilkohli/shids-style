"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getProductPrice, useCommerceStore } from "./lib/store";
import { classNames, formatCurrency } from "./lib/utils";
import type { Product } from "./lib/types";
import CartDrawer from "./components/CartDrawer";
import HeroCarousel, { HeroItem } from "./components/HeroCarousel";

const categories = ["All", "Oversized Tees", "Summer Dresses", "Cargo & Denims", "Knitwear", "Accessories"];

type FilterState = {
  search: string;
  category: string;
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

  return (
    <div className="group relative rounded-lg overflow-hidden card-surface hover-3d">
      <div className="absolute top-3 right-3 z-10">
        <button
          className={classNames(
            "rounded-full w-10 h-10 flex items-center justify-center transition-colors icon-button",
            wished ? "bg-[color:var(--primary)] text-white border-transparent" : "hover:bg-[color:var(--primary-soft)]"
          )}
          onClick={() => onWishlist(product.id)}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
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

      <div className="p-3 sm:p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/products/${product.slug}`} className="flex-1">
            <h3 className="text-sm sm:text-base font-medium text-gray-900 hover:underline">{product.name}</h3>
          </Link>
        </div>
        
        <div className="text-xs sm:text-sm text-gray-500">{product.category}</div>

        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-gray-900">{formatCurrency(sale)}</span>
          {compareAt !== sale && (
            <span className="text-sm text-gray-400 line-through">{formatCurrency(compareAt)}</span>
          )}
        </div>

        <button
          className="w-full rounded-full btn-primary px-4 py-2.5 text-xs sm:text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-300"
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
    products,
    cart,
    wishlist,
    addToCart,
    toggleWishlist,
    updateCartQuantity,
    removeFromCart,
    ready,
  } = useCommerceStore();

  const [filters, setFilters] = useState<FilterState>({ search: "", category: "All" });
  const [showCart, setShowCart] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState<string | null>(null);
  const [heroItems, setHeroItems] = useState<HeroItem[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    if (value.trim()) {
      scrollToSection("products");
    }
  };

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleSearchChange("");
        setSearchExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    const loadHero = async () => {
      try {
        const res = await fetch("/api/hero");
        const json = await res.json();
        if (json?.ok) {
          const items = (json.data as HeroItem[]) ?? [];
          setHeroItems(items.filter((item) => item?.product));
        }
      } catch (error) {
        console.warn("Failed to load hero products", error);
      }
    };
    loadHero();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.tags.some((tag) => tag.toLowerCase().includes(filters.search.toLowerCase()));
      const matchesCategory = filters.category === "All" || product.category === filters.category;
      return matchesSearch && matchesCategory;
    });
  }, [products, filters]);

  const shouldCenterProducts = filteredProducts.length > 0 && filteredProducts.length < 4;

  const cartSummary = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return sum;
      const { sale } = getProductPrice(product);
      return sum + sale * item.quantity;
    }, 0);
    return { subtotal, itemCount: cart.reduce((sum, item) => sum + item.quantity, 0) };
  }, [cart, products]);

  const heroSlides = useMemo<HeroItem[]>(() => {
    if (heroItems.length) return heroItems;
    return products.slice(0, 5).map((product, index) => ({
      id: product.id,
      position: index,
      product,
    }));
  }, [heroItems, products]);


  if (!ready) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center text-lg font-medium text-gray-600">
          Loading SHIDS STYLE...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <HeroCarousel items={heroSlides} />

      {/* Featured Collections - 3 Column Grid */}
      <section className="py-10 sm:py-16 section-tint">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Link href="#products" className="group relative aspect-[3/4] overflow-hidden rounded-lg glass-card hover-3d">
              <img
                src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=800&fit=crop"
                alt="Oversized Tees"
                className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
                <h3 className="font-display text-3xl font-bold text-white">Oversized Tees</h3>
              </div>
            </Link>
            <Link href="#products" className="group relative aspect-[3/4] overflow-hidden rounded-lg glass-card hover-3d">
              <img
                src="https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&h=800&fit=crop"
                alt="Summer Dresses"
                className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
                <h3 className="font-display text-3xl font-bold text-white">Summer Dresses</h3>
              </div>
            </Link>
            <Link href="#products" className="group relative aspect-[3/4] overflow-hidden rounded-lg glass-card hover-3d">
              <img
                src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&h=800&fit=crop"
                alt="Cargo & Denims"
                className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
                <h3 className="font-display text-3xl font-bold text-white">Cargo & Denims</h3>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Product Grid Section */}
      <section id="products" className="py-10 sm:py-16 section-tint">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">All Collection</h2>
              <p className="text-sm text-gray-500">Unmatched design and superior comfort.</p>
            </div>
            <button
              type="button"
              className={`flex items-center h-10 rounded-full px-3 transition-all duration-300 border border-transparent ${
                searchExpanded ? "w-64 bg-gray-200/80 border-gray-200 shadow" : "w-10 bg-transparent"
              }`}
              onClick={() => {
                setSearchExpanded(true);
                setTimeout(() => searchInputRef.current?.focus(), 0);
              }}
              aria-label="Search"
              aria-expanded={searchExpanded}
            >
              <span className="text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className={`ml-2 w-full bg-transparent text-sm text-gray-700 placeholder-gray-500 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-black/10 ${
                  searchExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                placeholder="I'm looking for..."
                value={filters.search}
                onChange={(event) => handleSearchChange(event.target.value)}
                onBlur={() => {
                  if (!filters.search.trim()) {
                    setSearchExpanded(false);
                  }
                }}
              />
            </button>
          </div>
          {/* Filters */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={classNames(
                    "px-4 py-2 rounded-full text-sm font-medium transition border",
                    filters.category === cat
                      ? "bg-[color:var(--primary)] text-white border-transparent"
                      : "btn-outline hover:bg-[color:var(--primary-soft)]"
                  )}
                  onClick={() => setFilters((prev) => ({ ...prev, category: cat }))}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div
            className={classNames(
              shouldCenterProducts
                ? "flex flex-wrap justify-center gap-3 sm:gap-6"
                : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6"
            )}
          >
            {filteredProducts.length === 0 && (
              <div className="col-span-full rounded-2xl border border-gray-200 bg-white/90 p-8 text-center text-sm text-gray-600">
                No products found. Try a different search or category.
              </div>
            )}
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={classNames(
                  shouldCenterProducts ? "w-[46%] sm:w-[220px] lg:w-[250px]" : "w-full"
                )}
              >
                <ProductCard
                  product={product}
                  wished={wishlist.includes(product.id)}
                  onWishlist={toggleWishlist}
                  onAdd={(p) => {
                    addToCart({ productId: p.id, quantity: 1 });
                    setShowCart(true);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 section-tint">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-semibold">Customer Say!</p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900">Loved by the SHIDS community</h2>
            <p className="mt-2 text-sm text-gray-500">Real feedback from customers who wear us daily.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                name: "Nisha R.",
                text: "The fabric feels premium and the fit is exactly what I wanted. Shipping was quick too.",
              },
              {
                name: "Aarav K.",
                text: "Great quality and the colors stay fresh after washes. I’m already ordering a second piece.",
              },
              {
                name: "Meera V.",
                text: "Customer support was super helpful with size queries. Love the overall experience.",
              },
            ].map((review) => (
              <div key={review.name} className="rounded-2xl glass-card p-5">
                <p className="text-sm text-gray-700 leading-relaxed">“{review.text}”</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{review.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section id="newsletter" className="py-12 sm:py-16 section-tint">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">
              Get exclusive deals and early access to new products.
            </h2>
            <form
              className="relative max-w-md mx-auto glass-card rounded-full"
              onSubmit={async (event) => {
                event.preventDefault();
                const normalized = newsletterEmail.trim().toLowerCase();
                if (!normalized || !normalized.includes("@")) {
                  setNewsletterMessage("Please enter a valid email.");
                  return;
                }
                try {
                  const response = await fetch("/api/newsletter", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: normalized }),
                  });
                  const json = await response.json();
                  if (!response.ok || !json.ok) {
                    throw new Error(json.error || "Subscription failed.");
                  }
                  setNewsletterEmail("");
                  setNewsletterMessage("Thanks! You are subscribed.");
                } catch (error) {
                  setNewsletterMessage((error as Error).message);
                }
                setTimeout(() => setNewsletterMessage(null), 2500);
              }}
            >
              <input
                type="email"
                placeholder="Email address"
                className="w-full px-6 py-4 pr-14 rounded-full border border-gray-200 focus:outline-none focus:border-gray-400 transition bg-gray-50 focus-visible:ring-2 focus-visible:ring-black/10"
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                required
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full btn-primary flex items-center justify-center transition"
                aria-label="Subscribe"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </form>
            {newsletterMessage && (
              <p className="mt-3 text-xs text-gray-600" aria-live="polite">{newsletterMessage}</p>
            )}
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12 section-tint">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { title: "Premium Fabric", body: "Soft-touch blends with durable stitching for daily wear." },
              { title: "Exclusive Seasonal Picks", body: "Curated edits that drop in limited batches." },
              { title: "Limited Quantity", body: "Small runs to keep every piece feeling special." },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-black/70 bg-[#f5efe6]/90 backdrop-blur p-5 text-center shadow-sm"
              >
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="mt-2 text-xs text-gray-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
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
