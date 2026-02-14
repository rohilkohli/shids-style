"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductPrice, useCommerceStore } from "@/app/lib/store";
import { classNames, formatCurrency, renderDescriptionHtml } from "@/app/lib/utils";
import type { Product } from "@/app/lib/types";

export default function ProductDetail({ params }: { params: { slug: string } }) {
  const { ready, getProductBySlug, addToCart, toggleWishlist, wishlist, products } = useCommerceStore();
  const product = getProductBySlug(params.slug);

  if (!ready) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center text-lg font-medium text-gray-600">
          Loading product...
        </div>
      </main>
    );
  }

  if (!product) return notFound();

  const { sale, compareAt } = getProductPrice(product);
  const wished = wishlist.includes(product.id);
  const lowStock = product.stock > 0 && product.stock <= 5;
  const alsoLike = products.filter((p: Product) => p.category === product.category && p.id !== product.id).slice(0, 3);

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
              ← Back to Store
            </Link>
            <Link href="/" className="absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-2xl font-display font-bold tracking-tight text-gray-900">SHIDS STYLE</h1>
            </Link>
            <div className="w-24" /> {/* Spacer */}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Product Images */}
          <div>
            <div className="aspect-[3/4] overflow-hidden rounded-lg bg-gray-50 relative">
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-4">
                {product.images.slice(1).map((img, idx) => (
                  <div key={idx} className="aspect-square overflow-hidden rounded-lg bg-gray-50 relative">
                    <Image
                      src={img}
                      alt={`${product.name} ${idx + 2}`}
                      fill
                      sizes="(min-width: 1024px) 12vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">{product.category}</p>
              <h2 className="font-display text-4xl font-bold text-gray-900">{product.name}</h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-3xl font-semibold text-gray-900">{formatCurrency(sale)}</span>
              {product.discountPercent && product.discountPercent > 0 && compareAt !== sale && (
                <>
                  <span className="text-xl text-gray-400 line-through">{formatCurrency(compareAt)}</span>
                  <span className="rounded-full bg-black text-white text-xs px-3 py-1 font-medium">
                    SAVE {product.discountPercent}%
                  </span>
                </>
              )}
            </div>

            {lowStock && (
              <div className="inline-block rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
                Only {product.stock} left in stock
              </div>
            )}

            <div
              className="text-base text-gray-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderDescriptionHtml(product.description) }}
            />

            {/* Highlights */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Product Features</h3>
              <ul className="space-y-2">
                {product.highlights.map((highlight: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colors */}
            {product.colors.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Available Colors</h3>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => {
                    const name = typeof color === "string" ? color : color.name;
                    return (
                      <span key={name} className="px-3 py-1 text-sm border border-gray-200 rounded-full bg-gray-50">
                        {name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sizes */}
            {product.sizes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Available Sizes</h3>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size: string) => (
                    <button key={size} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:border-black hover:bg-gray-50 transition">
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                className="flex-1 rounded-full bg-black px-8 py-4 text-base font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-300"
                onClick={() => addToCart({ productId: product.id, quantity: 1 })}
                disabled={product.stock === 0}
              >
                {product.stock === 0 ? "Sold Out" : "Add to Bag"}
              </button>
              <button
                className={classNames(
                  "w-14 h-14 rounded-full border-2 flex items-center justify-center text-xl transition",
                  wished 
                    ? "bg-black border-black text-white" 
                    : "border-gray-300 text-gray-600 hover:border-black hover:bg-gray-50"
                )}
                onClick={() => toggleWishlist(product.id)}
              >
                {wished ? "♥" : "♡"}
              </button>
            </div>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="pt-6 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag: string) => (
                    <span key={tag} className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {alsoLike.length > 0 && (
          <section className="mt-20">
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-8">You May Also Like</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {alsoLike.map((item: Product) => {
                const price = getProductPrice(item);
                return (
                  <Link
                    key={item.id}
                    href={`/products/${item.slug}`}
                    className="group"
                  >
                    <div className="aspect-[3/4] overflow-hidden rounded-lg bg-gray-50 mb-3 relative">
                      <Image
                        src={item.images[0]}
                        alt={item.name}
                        fill
                        sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mb-1">{item.category}</p>
                    <h4 className="text-sm font-medium text-gray-900 group-hover:underline">{item.name}</h4>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(price.sale)}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
