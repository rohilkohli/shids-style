"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getProductPrice, useCommerceStore } from "./lib/store";
import { classNames } from "./lib/utils";
import { validateEmail, normalizeEmail } from "./lib/emailValidation";
import type { Category, Product } from "./lib/types";
import CartDrawer from "./components/CartDrawer";
import HeroCarousel, { HeroItem } from "./components/HeroCarousel";
import { ProductQuickView } from "./components/ProductQuickView";
import { HomePageSkeleton } from "./components/Skeleton";
import { ProductShowcaseSection, getNewArrivals, getBestSellers } from "./components/ProductShowcase";
import { SearchAutocomplete } from "./components/SearchAutocomplete";
import UnifiedProductCard from "./components/UnifiedProductCard";

const TESTIMONIALS = [
  { id: 1, name: "Priya S.", text: "The quality exceeded my expectations! Fast delivery and amazing fit.", rating: 5, location: "Mumbai" },
  { id: 2, name: "Rahul M.", text: "Best online shopping experience I've had. Will definitely order again.", rating: 5, location: "Delhi" },
  { id: 3, name: "Anita K.", text: "Love the unique designs. Got so many compliments on my new outfit!", rating: 5, location: "Bangalore" },
  { id: 4, name: "Vikram P.", text: "Great customer service when I needed to exchange sizes. Highly recommend!", rating: 4, location: "Chennai" },
  { id: 5, name: "Meera R.", text: "The fabric quality is amazing for this price point. Very happy customer.", rating: 5, location: "Hyderabad" },
];

const SHIPPING_DURATION = "48 hours";

type FilterState = {
  search: string;
  category: string;
};

type SortKey = "featured" | "price-asc" | "price-desc" | "rating" | "discount";

const discountPercentValue = (product: Product) => {
  const { sale, compareAt } = getProductPrice(product);
  return product.discountPercent ?? (compareAt > sale ? Math.max(0, Math.round(((compareAt - sale) / compareAt) * 100)) : 0);
};

export default function HomeClient({ initialHeroItems }: { initialHeroItems: HeroItem[] }) {
  const {
    products,
    wishlist,
    addToCart,
    toggleWishlist,
    ready,
  } = useCommerceStore();

  const [filters, setFilters] = useState<FilterState>({ search: "", category: "All" });
  const [sortKey, setSortKey] = useState<SortKey>("featured");
  const [showCart, setShowCart] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState<string | null>(null);
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "success" | "error">("idle");
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [heroItems] = useState<HeroItem[]>(initialHeroItems);
  const [categoryItems, setCategoryItems] = useState<Category[]>([]);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const categoryNames = useMemo(() => {
    if (categoryItems.length) return categoryItems.map((item) => item.name).filter(Boolean);
    return Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  }, [categoryItems, products]);

  // Only show categories that have products
  const categories = useMemo(() => {
    const categoriesWithProducts = categoryNames.filter(cat =>
      products.some(p => p.category === cat)
    );
    return ["All", ...categoriesWithProducts];
  }, [categoryNames, products]);
  const featuredCategories = useMemo<Category[]>(() => {
    if (categoryItems.length) {
      return categoryItems
        .filter((cat) =>
          // include only if there's a product in this category
          products.some((p) => p.category === cat.name) ||
          // or if category explicitly references a featured product that exists
          (cat.featuredProductId !== undefined && products.some((p) => p.id === cat.featuredProductId))
        )
        .slice(0, 3);
    }
    const buildFallback = (name: string, index: number) => ({
      id: -(index + 1),
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      featuredProductId: undefined,
    });
    if (categoryNames.length >= 3) {
      return categoryNames.slice(0, 3).map(buildFallback);
    }
    const fallbacks = ["New Arrivals", "Signature Fits", "Everyday Essentials"];
    return [...categoryNames, ...fallbacks].slice(0, 3).map(buildFallback);
  }, [categoryItems, categoryNames, products]);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    if (value.trim()) {
      scrollToSection("products");
    }
  }, [scrollToSection]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleSearchChange("");
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [handleSearchChange]);

  useEffect(() => {
    let isActive = true;
    const loadCategories = async () => {
      try {
        const response = await fetch("/api/categories");
        const json = await response.json();
        if (isActive && response.ok && json?.ok) {
          setCategoryItems(json.data as Category[]);
        }
      } catch (error) {
        console.warn("Failed to load categories", error);
      }
    };
    loadCategories();
    return () => {
      isActive = false;
    };
  }, []);

  // Testimonials rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.tags.some((tag) => tag.toLowerCase().includes(filters.search.toLowerCase()));
      const matchesCategory = filters.category === "All" || product.category === filters.category;
      return matchesSearch && matchesCategory;
    });
  }, [products, filters]);

  const sortedProducts = useMemo(() => {
    const next = [...filteredProducts];
    switch (sortKey) {
      case "price-asc":
        next.sort((a, b) => getProductPrice(a).sale - getProductPrice(b).sale);
        break;
      case "price-desc":
        next.sort((a, b) => getProductPrice(b).sale - getProductPrice(a).sale);
        break;
      case "rating":
        next.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case "discount":
        next.sort((a, b) => discountPercentValue(b) - discountPercentValue(a));
        break;
      default:
        break;
    }
    return next;
  }, [filteredProducts, sortKey]);

  const shouldCenterProducts = sortedProducts.length > 0 && sortedProducts.length < 4;

  const heroSlides = useMemo<HeroItem[]>(() => {
    if (heroItems.length) return heroItems;
    return products.slice(0, 5).map((product, index) => ({
      id: product.id,
      position: index,
      product,
    }));
  }, [heroItems, products]);

  const featuredCards = useMemo(() => {
    return featuredCategories.map((category) => {
      const featuredProduct = category.featuredProductId
        ? products.find((product) => product.id === category.featuredProductId)
        : products.find((product) => product.category === category.name);
      return {
        category,
        image: featuredProduct?.images?.[0] ?? "/file.svg",
      };
    });
  }, [featuredCategories, products]);

  useEffect(() => {
    if (filters.category !== "All" && !categories.includes(filters.category)) {
      requestAnimationFrame(() => setFilters((prev) => ({ ...prev, category: "All" })));
    }
  }, [categories, filters.category]);

  if (!ready) {
    return <HomePageSkeleton />;
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <HeroCarousel items={heroSlides} />

      {/* Featured Collections - 3 Column Grid */}
      <section className="py-10 sm:py-16 section-tint">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {featuredCards.map((item) => (
              <Link
                key={item.category.id}
                href="#products"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, category: item.category.name }));
                }}
                className="group relative aspect-[3/4] overflow-hidden rounded-lg glass-card hover-3d"
              >
                <Image
                  src={item.image}
                  alt={item.category.name}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
                  <h3 className="font-display text-xl sm:text-2xl font-semibold text-white">{item.category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals Section */}
      <ProductShowcaseSection
        title="New Arrivals"
        subtitle="Fresh drops just for you"
        products={getNewArrivals(products, 4)}
        icon="new"
        viewAllLink="/shop?sort=newest"
      />

      {/* Best Sellers Section */}
      <ProductShowcaseSection
        title="Best Sellers"
        subtitle="Top rated by our community"
        products={getBestSellers(products, 4)}
        icon="trending"
        viewAllLink="/shop?sort=rating"
      />

      {/* Product Grid Section */}
      <section id="products" className="py-10 sm:py-16 section-tint">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">All Collection</h2>
              <p className="text-sm text-gray-500">Unmatched design and superior comfort.</p>
            </div>
            <SearchAutocomplete
              onSearch={handleSearchChange}
              placeholder="Search products..."
              className="w-full sm:w-80"
            />
          </div>
          {/* Filters */}
          <div className="mb-8 space-y-4 frosted-rail px-4 py-3 sm:py-4 rounded-3xl sm:rounded-full">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 hide-scrollbar sm:flex-wrap sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={classNames(
                      "px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition border shrink-0",
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
              <div className="flex items-center gap-2 overflow-x-auto rounded-3xl sm:rounded-full border border-black/10 bg-white/70 px-3 py-2 shadow-sm hide-scrollbar sm:flex-wrap sm:overflow-visible">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 shrink-0">Sort</span>
                {[
                  { key: "featured", label: "Featured" },
                  { key: "price-asc", label: "Price ↑" },
                  { key: "price-desc", label: "Price ↓" },
                  { key: "rating", label: "Top rated" },
                  { key: "discount", label: "Biggest drop" },
                ].map((option) => (
                  <button
                    key={option.key}
                    className={classNames(
                      "px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition border shrink-0",
                      sortKey === (option.key as SortKey)
                        ? "bg-gray-900 text-white border-transparent"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                    )}
                    onClick={() => setSortKey(option.key as SortKey)}
                    aria-pressed={sortKey === option.key}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
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
            {sortedProducts.length === 0 && (
              <div className="col-span-full rounded-2xl border border-gray-200 bg-white/90 p-8 text-center text-sm text-gray-600">
                No products found. Try a different search or category.
              </div>
            )}
            {sortedProducts.map((product) => (
              <div
                key={product.id}
                className={classNames(
                  shouldCenterProducts ? "w-[46%] sm:w-[220px] lg:w-[250px]" : "w-full"
                )}
              >
                <UnifiedProductCard
                  id={product.id}
                  name={product.name}
                  image={product.images?.[0] ?? "/file.svg"}
                  price={getProductPrice(product).sale}
                  oldPrice={getProductPrice(product).compareAt}
                  bestseller={product.bestseller}
                  badge={product.badge}
                  discountPercent={product.discountPercent}
                  stock={product.stock}
                  variants={product.variants}
                  
                  category={product.category}
                  rating={product.rating}
                  colors={product.colors}
                  slug={product.slug}
                  wished={wishlist.includes(product.id)}
                  onWishlist={toggleWishlist}
                  onAdd={() => {
                      if (product.variants && product.variants.length === 1) {
                        const v = product.variants[0];
                        addToCart({ productId: product.id, quantity: 1, variantId: v.id, color: v.color, size: v.size });
                        setShowCart(true);
                      } else {
                        setQuickViewProduct(product);
                      }
                    }}
                  onClick={() => setQuickViewProduct(product)}
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

          {/* Featured rotating testimonial */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="rounded-2xl glass-card p-6 sm:p-8 text-center relative overflow-hidden">
              <div className="absolute -top-2 -left-2 text-6xl text-gray-200" aria-hidden="true">&ldquo;</div>
              <p className="text-sm sm:text-base text-gray-700 mb-4 line-clamp-3 relative z-10">
                {TESTIMONIALS[testimonialIndex].text}
              </p>
              <div className="mt-4 flex items-center justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 ${i < TESTIMONIALS[testimonialIndex].rating ? "text-amber-400" : "text-gray-200"}`}
                    fill="currentColor"
                  >
                    <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                ))}
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-900">
                {TESTIMONIALS[testimonialIndex].name}
              </p>
              <p className="text-xs text-gray-500">{TESTIMONIALS[testimonialIndex].location}</p>
            </div>
          </div>

          {/* Navigation dots */}
          <div className="flex justify-center gap-2 mt-4">
            {TESTIMONIALS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setTestimonialIndex(idx)}
                className={`h-2 w-2 rounded-full transition-all ${idx === testimonialIndex
                  ? "bg-gray-900 w-6"
                  : "bg-gray-300 hover:bg-gray-400"
                  }`}
                aria-label={`View testimonial ${idx + 1}`}
              />
            ))}
          </div>

          {/* Static testimonial grid */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {TESTIMONIALS.slice(0, 3).map((review) => (
              <div key={review.id} className="rounded-2xl glass-card p-5">
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      viewBox="0 0 24 24"
                      className={`h-3 w-3 ${i < review.rating ? "text-amber-400" : "text-gray-200"}`}
                      fill="currentColor"
                    >
                      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">&ldquo;{review.text}&rdquo;</p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-900">{review.name}</p>
                  <p className="text-xs text-gray-500">{review.location}</p>
                </div>
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
                const validation = validateEmail(newsletterEmail);

                if (!validation.isValid) {
                  setNewsletterStatus("error");
                  setNewsletterMessage(validation.error || "Please enter a valid email.");
                  setTimeout(() => {
                    setNewsletterMessage(null);
                    setNewsletterStatus("idle");
                  }, 4000);
                  return;
                }

                try {
                  const response = await fetch("/api/newsletter", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: normalizeEmail(newsletterEmail) }),
                  });
                  const json = await response.json();
                  if (!response.ok || !json.ok) {
                    throw new Error(json.error || "Subscription failed.");
                  }
                  setNewsletterEmail("");
                  setNewsletterStatus("success");
                  setNewsletterMessage("Thanks! You're subscribed.");
                } catch (error) {
                  setNewsletterStatus("error");
                  setNewsletterMessage((error as Error).message);
                }
                setTimeout(() => {
                  setNewsletterMessage(null);
                  setNewsletterStatus("idle");
                }, 2500);
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
              <p
                className={`mt-3 text-xs ${newsletterStatus === "success"
                  ? "text-green-600"
                  : newsletterStatus === "error"
                    ? "text-red-600"
                    : "text-gray-600"
                  }`}
                aria-live="polite"
              >
                {newsletterMessage}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="section-tint border-y border-black/5 py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              {
                title: `${SHIPPING_DURATION} Shipping`,
                body: "Speed-run fulfillment with live order tracking.",
                icon: (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path d="M3 12h6l2-9 4 18 2-9h4" />
                  </svg>
                ),
              },
              {
                title: "Easy Exchanges",
                body: "Instant chat support for size swaps and returns.",
                icon: (
                  <Image
                    src="/exchange.svg"
                    alt="Exchange"
                    width={20}
                    height={20}
                    className="h-5 w-5 object-contain"
                  />
                ),
              },
              {
                title: "Cash on Delivery",
                body: "Secure checkout with COD on most pincodes.",
                icon: (
                  <Image
                    src="/cod.svg"
                    alt="Cash on Delivery"
                    width={20}
                    height={20}
                    className="h-5 w-5 object-contain"
                  />
                ),
              },
            ].map((item) => (
              <div
                key={item.title}
                className="glass-card rounded-2xl border border-black/10 px-4 py-4 flex items-start gap-3 shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-black/10 text-gray-900">
                  {item.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <ProductQuickView
          product={quickViewProduct}
          isOpen={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAddToCart={(product) => {
            addToCart({ productId: product.id, quantity: 1 });
            setQuickViewProduct(null);
            setShowCart(true);
          }}
          onWishlist={toggleWishlist}
          isWished={wishlist.includes(quickViewProduct.id)}
        />
      )}

      <CartDrawer
        isOpen={showCart}
        onOpen={() => setShowCart(true)}
        onClose={() => setShowCart(false)}
        hideTrigger
      />
    </main>
  );
}
