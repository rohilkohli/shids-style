"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getProductPrice, useCommerceStore } from "@/app/lib/store";
import { classNames, formatCurrency } from "@/app/lib/utils";
import type { Product } from "@/app/lib/types";

export default function ProductDetailClient({ slug }: { slug: string }) {
  const { ready, getProductBySlug, addToCart, toggleWishlist, wishlist, products, addRecentlyViewed } = useCommerceStore();
  const product = getProductBySlug(slug);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const WHATSAPP_NUMBER = "919084978839";

  useEffect(() => {
    if (product) {
      addRecentlyViewed(product.id);
      setSelectedColor(product.colors[0] ?? null);
      setSelectedSize(product.sizes[0] ?? null);
      setSelectedImageIndex(0);
      setQuantity(1);
    }
  }, [product, addRecentlyViewed]);

  const alsoLike = useMemo(() => {
    if (!product) return [] as Product[];
    const sameCategory = products.filter((p: Product) => p.category === product.category && p.id !== product.id);
    const fallback = products.filter((p: Product) => p.id !== product.id);
    return (sameCategory.length ? sameCategory : fallback).slice(0, 4);
  }, [products, product?.id, product?.category]);

  const productImages = useMemo(() => (product?.images ?? []).filter(Boolean), [product?.images]);
  const activeImage = productImages[selectedImageIndex] ?? productImages[0];
  const canSelectColor = Boolean(product?.colors?.length);
  const canSelectSize = Boolean(product?.sizes?.length);

  if (!ready) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 text-gray-800">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center text-lg font-bold text-gray-600">
          Loading product...
        </div>
      </main>
    );
  }

  if (!product) return notFound();

  const { sale, compareAt } = getProductPrice(product);
  const wished = wishlist.includes(product.id);
  const lowStock = product.stock > 0 && product.stock <= 5;

  return (
    <main className="min-h-screen bg-[color:var(--background)] text-gray-800">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/" className="hover:text-black font-semibold transition">Home</Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-black font-semibold transition">Shop</Link>
            <span>/</span>
            <span className="font-semibold text-gray-800">{product.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="rounded-full border border-gray-200 px-3 py-1">Product</span>
            {product.badge && <span className="rounded-full bg-black text-white px-3 py-1">{product.badge}</span>}
          </div>
        </header>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg group">
              <img src={activeImage} alt={product.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              {product.discountPercent ? (
                <div className="absolute right-4 top-4 rounded-full bg-black px-3 py-1 text-xs font-semibold text-white shadow">
                  -{product.discountPercent}%
                </div>
              ) : null}
              {productImages.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 text-gray-900 shadow"
                    onClick={() =>
                      setSelectedImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length)
                    }
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 text-gray-900 shadow"
                    onClick={() => setSelectedImageIndex((prev) => (prev + 1) % productImages.length)}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
              {productImages.map((img, index) => (
                <button
                  key={img}
                  type="button"
                  className={classNames(
                    "aspect-square overflow-hidden rounded-2xl border bg-white",
                    selectedImageIndex === index ? "border-black" : "border-gray-200 hover:border-gray-400"
                  )}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <img src={img} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24">
            <div className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-lg">
              <p className="text-xs uppercase tracking-[0.25em] text-gray-500 font-semibold">{product.category}</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">{product.name}</h1>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-1 text-amber-500 text-sm">★★★★★</div>
                <span className="text-xs text-gray-500">4.8 · 22 reviews</span>
              </div>

              <div className="mt-4 flex items-center gap-3 text-2xl font-semibold">
                <span className="text-gray-900">{formatCurrency(sale)}</span>
                {compareAt !== sale && <span className="text-lg text-gray-400 line-through">{formatCurrency(compareAt)}</span>}
              </div>
              <p className={classNames("mt-2 text-sm font-medium", lowStock ? "text-amber-600" : "text-gray-500")}>
                {product.stock > 0 ? `Hurry up! Only ${product.stock} item(s) left` : "Sold out"}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-gray-600">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-center">Easy Returns</div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-center">Cash on Delivery</div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-center">Secure Checkout</div>
              </div>

              <div className="mt-5 space-y-4">
                {canSelectColor && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">Color</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.colors.map((color: string) => (
                      <button
                        key={color}
                        className={classNames(
                          "rounded-full border px-4 py-2 text-xs font-semibold",
                          selectedColor === color
                            ? "border-black bg-black text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:border-black"
                        )}
                        onClick={() => setSelectedColor(color)}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
                )}

                {canSelectSize && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">Size</p>
                    <button type="button" className="text-xs text-gray-500 hover:text-black">
                      Size guide
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.sizes.map((size: string) => (
                      <button
                        key={size}
                        className={classNames(
                          "min-w-[56px] rounded-full border px-4 py-2 text-xs font-semibold",
                          selectedSize === size
                            ? "border-black bg-black text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:border-black"
                        )}
                        onClick={() => setSelectedSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center overflow-hidden rounded-full border border-gray-300">
                    <button
                      type="button"
                      className="h-10 w-10 text-gray-600 hover:bg-gray-100"
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-sm font-semibold text-gray-800">{quantity}</span>
                    <button
                      type="button"
                      className="h-10 w-10 text-gray-600 hover:bg-gray-100"
                      onClick={() =>
                        setQuantity((prev) => (product.stock ? Math.min(product.stock, prev + 1) : prev + 1))
                      }
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="flex-1 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={product.stock === 0}
                    onClick={() => {
                      if (canSelectColor && !selectedColor) {
                        setActionMessage("Please choose a color.");
                        return;
                      }
                      if (canSelectSize && !selectedSize) {
                        setActionMessage("Please choose a size.");
                        return;
                      }
                      const nextQty = Math.min(quantity, product.stock || 1);
                      addToCart({
                        productId: product.id,
                        quantity: nextQty,
                        color: selectedColor ?? undefined,
                        size: selectedSize ?? undefined,
                      });
                      setActionMessage("Added to cart.");
                      setTimeout(() => setActionMessage(null), 2000);
                    }}
                  >
                    Add to Cart
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={classNames(
                      "rounded-full border px-4 py-2 text-xs font-semibold",
                      wished ? "border-black bg-black text-white" : "border-gray-300 text-gray-700 hover:border-black"
                    )}
                    onClick={() => toggleWishlist(product.id)}
                  >
                    {wished ? "Saved" : "Save"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:border-black"
                    onClick={() => {
                      const details = [
                        `Product: ${product.name}`,
                        selectedColor ? `Color: ${selectedColor}` : null,
                        selectedSize ? `Size: ${selectedSize}` : null,
                      ]
                        .filter(Boolean)
                        .join(" | ");
                      const text = `Hi! I'm interested in this item. ${details}`;
                      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
                      window.open(url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Ask a question
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:border-black"
                    onClick={async () => {
                      const shareUrl = window.location.href;
                      const shareText = `Check out ${product.name} on SHIDS STYLE.`;
                      if (navigator.share) {
                        try {
                          await navigator.share({ title: product.name, text: shareText, url: shareUrl });
                          return;
                        } catch {
                          // ignore
                        }
                      }
                      if (navigator.clipboard) {
                        await navigator.clipboard.writeText(shareUrl);
                        setActionMessage("Link copied to clipboard.");
                        setTimeout(() => setActionMessage(null), 2000);
                      } else {
                        setActionMessage("Unable to share on this device.");
                        setTimeout(() => setActionMessage(null), 2000);
                      }
                    }}
                  >
                    Share
                  </button>
                </div>

                {actionMessage && (
                  <p className="text-xs text-gray-600">{actionMessage}</p>
                )}

                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                  <p className="font-semibold text-gray-900">Guarantee Safe Checkout</p>
                  <img src="/payment-gw.png" alt="Payment methods" className="mt-3 h-10 w-44 object-cover sm:h-11 sm:w-52" />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-lg">
              <details open className="group">
                <summary className="cursor-pointer text-sm font-semibold text-gray-900">Description</summary>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{product.description}</p>
              </details>
              {product.highlights.length > 0 && (
                <details open className="group">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-900">Highlights</summary>
                  <ul className="mt-2 grid gap-2 text-sm text-gray-600">
                    {product.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-black" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <details className="group">
                <summary className="cursor-pointer text-sm font-semibold text-gray-900">Shipping and Returns</summary>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  Standard delivery in 3–7 business days. Express options may be available at checkout.
                </p>
              </details>
              <details className="group">
                <summary className="cursor-pointer text-sm font-semibold text-gray-900">Return Policies</summary>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  Returns accepted within 7 days of delivery for unused items in original packaging.
                </p>
              </details>
            </div>
          </div>
        </section>

        {alsoLike.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Pairs well with</h3>
              <Link href="/" className="text-sm text-gray-600 hover:text-black font-medium transition">View all</Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {alsoLike.map((item: Product) => {
                const price = getProductPrice(item);
                return (
                  <Link
                    key={item.id}
                    href={`/products/${item.slug}`}
                    className="block rounded-xl border border-gray-200 p-3 bg-white/95 shadow-sm hover:shadow-md transition"
                  >
                    <div className="aspect-square overflow-hidden rounded-lg bg-gray-50 border border-gray-200">
                      <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-gray-500 font-semibold">{item.category}</p>
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                    <p className="text-xs font-semibold text-gray-900">{formatCurrency(price.sale)}</p>
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
