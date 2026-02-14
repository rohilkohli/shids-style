"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getProductPrice, useCommerceStore } from "../lib/store";
import { classNames } from "../lib/utils";
import type { Category, Product } from "../lib/types";
import CartDrawer from "../components/CartDrawer";
import { Breadcrumbs, breadcrumbConfigs } from "../components/Breadcrumbs";
import { ShopPageSkeleton } from "../components/Skeleton";
import { Grid, List, X } from "lucide-react";
import UnifiedProductCard from "../components/UnifiedProductCard";

type SortOption = "featured" | "price-asc" | "price-desc" | "name";
type ViewMode = "grid" | "list";

export default function ShopClient() {
  const {
    products,
    wishlist,
    toggleWishlist,
    loadMoreProducts,
    productsHasMore,
    productsLoading,
    ready,
  } = useCommerceStore();

  return (
    <ProductGrid
      products={products}
      wishlist={wishlist}
      toggleWishlist={toggleWishlist}
      loadMoreProducts={loadMoreProducts}
      productsHasMore={productsHasMore}
      productsLoading={productsLoading}
      ready={ready}
    />
  );
}

function ProductGrid({
  products,
  wishlist,
  toggleWishlist,
  loadMoreProducts,
  productsHasMore,
  productsLoading,
  ready,
}: {
  products: Product[];
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  loadMoreProducts: () => void;
  productsHasMore: boolean;
  productsLoading: boolean;
  ready: boolean;
}) {
  const router = useRouter();
  const { addToCart: storeAddToCart } = useCommerceStore();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState<string | null>(null);
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortOption>("featured");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showCart, setShowCart] = useState(false);
  const [categoryItems, setCategoryItems] = useState<Category[]>([]);
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  const resolvedSearch = search ?? (searchParams.get("search") ?? "");

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
  const safeCategory = useMemo(
    () => (category !== "All" && !categories.includes(category) ? "All" : category),
    [category, categories]
  );

  const filteredProducts = useMemo(() => {
    let list = products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(resolvedSearch.toLowerCase()) ||
        product.tags.some((tag) => tag.toLowerCase().includes(resolvedSearch.toLowerCase()));
      const matchesCategory = safeCategory === "All" || product.category === safeCategory;
      return matchesSearch && matchesCategory;
    });

    if (sort === "price-asc") {
      list = [...list].sort((a, b) => getProductPrice(a).sale - getProductPrice(b).sale);
    } else if (sort === "price-desc") {
      list = [...list].sort((a, b) => getProductPrice(b).sale - getProductPrice(a).sale);
    } else if (sort === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [products, resolvedSearch, safeCategory, sort]);

  if (!isClient || !ready) {
    return <ShopPageSkeleton />;
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="py-8 sm:py-10 section-tint">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbConfigs.shop} className="mb-6" />
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Collection</h1>
              <p className="text-xs sm:text-sm text-gray-500">Browse the complete catalog.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search products..."
                className="w-full sm:w-64 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition bg-white text-sm focus-visible:ring-2 focus-visible:ring-black/10"
                value={resolvedSearch}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                value={safeCategory}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full sm:w-48 px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:border-gray-400 bg-white focus-visible:ring-2 focus-visible:ring-black/10"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="w-full sm:w-44 px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:border-gray-400 bg-white focus-visible:ring-2 focus-visible:ring-black/10"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          {/* Results summary, active filters, and view toggle */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{filteredProducts.length}</span>
                {" "}result{filteredProducts.length !== 1 ? "s" : ""}
                {resolvedSearch && (
                  <span> for &quot;<span className="font-medium">{resolvedSearch}</span>&quot;</span>
                )}
              </span>

              {/* Active filters */}
              {(resolvedSearch || safeCategory !== "All" || sort !== "featured") && (
                <div className="flex flex-wrap items-center gap-1.5 ml-2">
                  {safeCategory !== "All" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                      {safeCategory}
                      <button
                        onClick={() => setCategory("All")}
                        className="hover:text-gray-900"
                        aria-label="Clear category filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {sort !== "featured" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                      {sort === "price-asc" ? "Price ↑" : sort === "price-desc" ? "Price ↓" : "A-Z"}
                      <button
                        onClick={() => setSort("featured")}
                        className="hover:text-gray-900"
                        aria-label="Clear sort"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {resolvedSearch && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                      &quot;{resolvedSearch.slice(0, 20)}{resolvedSearch.length > 20 ? "..." : ""}&quot;
                      <button
                        onClick={() => setSearch("")}
                        className="hover:text-gray-900"
                        aria-label="Clear search"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSearch("");
                      setCategory("All");
                      setSort("featured");
                    }}
                    className="text-xs font-medium text-gray-500 hover:text-gray-900 underline ml-1"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={classNames(
                  "p-2 rounded-md transition-colors",
                  viewMode === "grid"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                )}
                aria-label="Grid view"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={classNames(
                  "p-2 rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                )}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className={classNames(
            "mt-6 sm:mt-8",
            viewMode === "grid"
              ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6"
              : "flex flex-col gap-4"
          )}>
            {filteredProducts.length === 0 && (
              <div className="col-span-full rounded-2xl border border-gray-200 bg-white/90 p-8 text-center text-sm text-gray-600">
                No products match your filters.
              </div>
            )}
            {filteredProducts.map((product) => (
              <UnifiedProductCard
                key={product.id}
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
                    storeAddToCart({ productId: product.id, quantity: 1, variantId: v.id, color: v.color, size: v.size });
                    setShowCart(true);
                  } else {
                    router.push(`/products/${product.slug}`);
                  }
                }}
              />
            ))}
          </div>

          {productsHasMore && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={loadMoreProducts}
                disabled={productsLoading}
                className="rounded-full border border-gray-300 bg-white px-6 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
              >
                {productsLoading ? "Loading more..." : "Load more"}
              </button>
            </div>
          )}
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
