"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { getProductPrice, useCommerceStore } from "../lib/store";
import { classNames, formatCurrency } from "../lib/utils";
import type { Product } from "../lib/types";
import CartDrawer from "../components/CartDrawer";

type SortOption = "featured" | "price-asc" | "price-desc" | "name";

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
            "rounded-full w-9 h-9 flex items-center justify-center transition-colors icon-button",
            wished ? "bg-[color:var(--primary)] text-white border-transparent" : "hover:bg-[color:var(--primary-soft)]"
          )}
          onClick={() => onWishlist(product.id)}
          aria-label="Toggle wishlist"
        >
          {wished ? "♥" : "♡"}
        </button>
      </div>

      <Link href={`/products/${product.slug}`}>
        <div className="aspect-[3/4] overflow-hidden bg-gray-50 relative">
          <Image
            src={product.images?.[0] ?? "/file.svg"}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            quality={80}
            className="object-cover transition duration-500 group-hover:scale-105"
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
          {product.stock === 0 ? "Sold Out" : "Add to Cart +"}
        </button>
      </div>
    </div>
  );
}

export default function ShopClient() {
  const searchParams = useSearchParams();
  const {
    products,
    wishlist,
    addToCart,
    toggleWishlist,
    loadMoreProducts,
    productsHasMore,
    productsLoading,
    ready,
  } = useCommerceStore();
  const [search, setSearch] = useState<string | null>(null);
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortOption>("featured");
  const [showCart, setShowCart] = useState(false);
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  const resolvedSearch = search ?? (searchParams.get("search") ?? "");

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category)))], [products]);

  const filteredProducts = useMemo(() => {
    let list = products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(resolvedSearch.toLowerCase()) ||
        product.tags.some((tag) => tag.toLowerCase().includes(resolvedSearch.toLowerCase()));
      const matchesCategory = category === "All" || product.category === category;
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
  }, [products, resolvedSearch, category, sort]);

  if (!isClient || !ready) {
    return <main className="min-h-screen bg-[color:var(--background)]" />;
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="py-8 sm:py-10 section-tint">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Collection</h1>
              <p className="text-xs sm:text-sm text-gray-500">Browse the complete catalog.</p>
            </div>
            <p className="text-xs text-gray-500">{filteredProducts.length} items</p>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search products..."
                className="w-full sm:w-64 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition bg-white text-sm focus-visible:ring-2 focus-visible:ring-black/10"
                value={resolvedSearch}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                value={category}
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

          <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {filteredProducts.length === 0 && (
              <div className="col-span-full rounded-2xl border border-gray-200 bg-white/90 p-8 text-center text-sm text-gray-600">
                No products match your filters.
              </div>
            )}
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                wished={wishlist.includes(product.id)}
                onWishlist={toggleWishlist}
                onAdd={(p) => {
                  addToCart({ productId: p.id, quantity: 1 });
                  setShowCart(true);
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
