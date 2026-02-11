"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCommerceStore, getProductPrice } from "@/app/lib/store";
import { ShoppingBag, Star, Truck, ShieldCheck } from "lucide-react";
import { formatCurrency, renderDescriptionHtml } from "@/app/lib/utils";
import { Breadcrumbs, breadcrumbConfigs } from "@/app/components/Breadcrumbs";
import { ProductDetailSkeleton } from "@/app/components/Skeleton";
import { useToast } from "@/app/components/Toast";

const useIsClient = () =>
  useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

export default function ProductDetailClient({ slug }: { slug: string }) {
  const {
    addToCart,
    toggleWishlist,
    wishlist,
    getProductBySlug,
    productsLoading,
  } = useCommerceStore();
  const { toast } = useToast();
  const isClient = useIsClient();
  const product = getProductBySlug(slug);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"desc" | "specs" | "shipping">("desc");
  const [mainImage, setMainImage] = useState<string | null>(null);

  const resolvedColor = (() => {
    if (!product?.colors?.length) return null;
    if (selectedColor && product.colors.includes(selectedColor)) return selectedColor;
    return product.colors[0] ?? null;
  })();

  const resolvedSize = (() => {
    if (!product?.sizes?.length) return null;
    if (selectedSize && product.sizes.includes(selectedSize)) return selectedSize;
    return product.sizes[0] ?? null;
  })();

  const resolvedMainImage = (() => {
    if (!product?.images?.length) return null;
    if (mainImage && product.images.includes(mainImage)) return mainImage;
    return product.images[0] ?? null;
  })();

  const resolvedQuantity = (() => {
    if (!product) return quantity;
    const max = Math.max(product.stock, 1);
    return Math.min(Math.max(quantity, 1), max);
  })();

  if (!isClient || (!product && productsLoading)) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="bg-white min-h-screen pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-medium text-black mb-2">Product not found</h1>
            <p className="text-gray-500">Try refreshing or return to the shop.</p>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center mt-6 px-6 h-12 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 transition"
            >
              Back to Shop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { sale, compareAt } = getProductPrice(product);
  const isWishlisted = wishlist.includes(product.id);

  // Find the matching variant for the selected color/size
  const selectedVariant = product.variants?.find(
    (v) => v.color === resolvedColor && v.size === resolvedSize
  );

  // Use variant stock if available, otherwise fall back to product stock
  const currentStock = selectedVariant?.stock ?? product.stock;
  
  // Helper to check if a specific size has any stock for the current color
  const isSizeAvailable = (size: string) => {
    if (!product.variants || product.variants.length === 0) return true;
    const variant = product.variants.find(
      (v) => v.size === size && v.color === resolvedColor
    );
    return variant ? variant.stock > 0 : true;
  };

  // Helper to check if a specific color has any stock for the current size
  const isColorAvailable = (color: string) => {
    if (!product.variants || product.variants.length === 0) return true;
    const variant = product.variants.find(
      (v) => v.color === color && v.size === resolvedSize
    );
    return variant ? variant.stock > 0 : true;
  };

  const clampQuantity = (next: number) => {
    const max = Math.max(currentStock, 1);
    return Math.min(Math.max(next, 1), max);
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (product.sizes.length > 0 && !resolvedSize) {
      toast.warning("Please select a size");
      return;
    }
    if (currentStock < resolvedQuantity) {
      toast.error("Sorry, we don't have enough stock for this selection.");
      return;
    }

    addToCart({
      productId: product.id,
      quantity: resolvedQuantity,
      color: resolvedColor || undefined,
      size: resolvedSize || undefined,
      variantId: selectedVariant?.id,
    });
    toast.success(`${product.name} added to cart!`);
  };

  return (
    <main className="bg-white min-h-screen pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbConfigs.product(product.name, product.category)} className="mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <div className="space-y-6 animate-slide-up">
            <div className="aspect-[4/5] relative bg-gray-100 rounded-2xl overflow-hidden shadow-lg group">
              {product.badge && (
                <div className="absolute top-4 left-4 bg-black text-white text-xs font-bold px-3 py-1 uppercase tracking-widest z-10">
                  {product.badge}
                </div>
              )}
              <Image
                src={resolvedMainImage || "/placeholder.png"}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((img, idx) => (
                <button
                  key={img}
                  onClick={() => setMainImage(img)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    resolvedMainImage === img ? "border-black ring-1 ring-black/10" : "border-transparent hover:border-gray-200"
                  }`}
                  aria-label={`View image ${idx + 1}`}
                >
                  <Image src={img} alt={`${product.name} view ${idx + 1}`} fill sizes="96px" className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="animate-slide-up delay-100">
            <div className="mb-8 border-b border-gray-100 pb-8">
              <div className="flex items-center gap-4 mb-4">
                <Star className="w-4 h-4 fill-current" />
                <span className="ml-1 text-sm font-medium text-gray-900">{product.rating || "New"}</span>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-500">{product.category}</span>
                <span className="text-gray-300">|</span>
                <span className={`text-sm font-medium ${currentStock > 0 ? "text-green-600" : "text-red-600"}`}>
                  {currentStock > 0 ? `In Stock (${currentStock} available)` : "Out of Stock"}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">{product.name}</h1>

              <div className="flex items-baseline gap-4">
                <span className="text-2xl font-semibold text-gray-900">{formatCurrency(sale)}</span>
                {product.discountPercent && compareAt !== sale && (
                  <>
                    <span className="text-lg text-gray-400 line-through decoration-1">{formatCurrency(compareAt)}</span>
                    <span className="text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                      -{product.discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {product.colors.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wide">Color</h3>
                  <div className="flex flex-wrap gap-3">
                    {product.colors.map((color, idx) => {
                      const available = isColorAvailable(color);
                      return (
                        <button
                          key={`${color}-${idx}`}
                          onClick={() => available && setSelectedColor(color)}
                          disabled={!available}
                          className={`px-6 py-2 rounded-full text-sm border transition-all ${
                            !available
                              ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through"
                              : resolvedColor === color
                                ? "border-black bg-black text-white shadow-md"
                                : "border-gray-200 text-gray-600 hover:border-gray-400"
                          }`}
                        >
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {product.sizes.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">Size</h3>
                    <button className="text-xs text-gray-500 underline hover:text-black" type="button">Size Guide</button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {product.sizes.map((size, idx) => {
                      const available = isSizeAvailable(size);
                      return (
                        <button
                          key={`${size}-${idx}`}
                          onClick={() => available && setSelectedSize(size)}
                          disabled={!available}
                          className={`py-3 rounded-lg text-sm border transition-all ${
                            !available
                              ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through"
                              : resolvedSize === size
                                ? "border-black bg-black text-white shadow-md"
                                : "border-gray-200 text-gray-600 hover:border-gray-400"
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wide">Quantity</h3>
                <div className="flex items-center w-32 border border-gray-200 rounded-lg">
                  <button
                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-black transition-colors"
                    onClick={() => setQuantity((prev) => clampQuantity(prev - 1))}
                    type="button"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    readOnly
                    value={resolvedQuantity}
                    className="w-12 text-center text-sm font-medium border-x border-gray-100 py-2 focus:outline-none"
                  />
                  <button
                    onClick={() => setQuantity((prev) => clampQuantity(prev + 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-black transition-colors"
                    type="button"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mb-10 mt-10">
              <button
                onClick={handleAddToCart}
                className="flex-1 bg-black text-white h-14 rounded-full font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                disabled={currentStock === 0}
              >
                <ShoppingBag className="w-5 h-5" />
                {currentStock > 0 ? "Add to Cart" : "Out of Stock"}
              </button>
              <button
                onClick={() => toggleWishlist(product.id)}
                className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${
                  isWishlisted
                    ? "border-red-500 bg-red-50 text-red-500"
                    : "border-gray-200 hover:border-black text-gray-500 hover:text-black"
                }`}
                type="button"
              >
                <Star className={`w-5 h-5 ${isWishlisted ? "fill-current" : ""}`} />
              </button>
            </div>

            <div className="border-t border-gray-100 pt-8">
              <div className="flex gap-8 mb-6 border-b border-gray-100">
                {(["desc", "specs", "shipping"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative pb-3 text-sm font-semibold transition ${
                      activeTab === tab ? "text-black" : "text-gray-400 hover:text-gray-600"
                    }`}
                    type="button"
                  >
                    {tab === "desc" ? "Description" : tab === "specs" ? "Details" : "Shipping"}
                    {activeTab === tab && (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              <div className="prose prose-sm text-gray-600 animate-fade-in">
                {activeTab === "desc" && (
                  <div dangerouslySetInnerHTML={{ __html: renderDescriptionHtml(product.description) }} />
                )}
                {activeTab === "specs" && (
                  <ul className="space-y-2">
                    {product.highlights.map((highlight, idx) => (
                      <li key={highlight ?? idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-black mt-2" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                )}
                {activeTab === "shipping" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-gray-400" />
                      <span>Free shipping on orders over Rs 999</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-gray-400" />
                      <span>30-day return policy</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
