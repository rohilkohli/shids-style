"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getProductPrice, useCommerceStore } from "../lib/store";
import { formatCurrency, toTitleCase } from "../lib/utils";

type CartDrawerProps = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  hideTrigger?: boolean;
};

export default function CartDrawer({ isOpen, onOpen, onClose, hideTrigger = false }: CartDrawerProps) {
  const { cart, products, updateCartQuantity, removeFromCart } = useCommerceStore();
  const [stockError, setStockError] = useState<string | null>(null);
  const canPortal = typeof document !== "undefined";

  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return sum;
      const { sale } = getProductPrice(product);
      return sum + sale * item.quantity;
    }, 0);
  }, [cart, products]);

  return (
    <>
      {!hideTrigger && (
        <button
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 rounded-full btn-primary w-12 h-12 flex items-center justify-center"
          aria-label="Open cart"
          onClick={onOpen}
        >
          🛒
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-white text-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-semibold">
              {itemCount}
            </span>
          )}
        </button>
      )}

      {canPortal && isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[60]" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <aside
              className="absolute right-0 top-0 h-full w-full sm:w-[360px] md:w-[400px] bg-white shadow-2xl border-l border-gray-200 transition-colors duration-200"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
                <h3 className="font-display font-bold text-base sm:text-lg">Your Cart</h3>
                <button
                  className="text-gray-500 hover:text-gray-900"
                  onClick={onClose}
                  aria-label="Close cart"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto h-[calc(100%-170px)]">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center text-center gap-4 py-6">
                    <Image
                      src="/empty-cart.png"
                      alt="Empty cart"
                      width={160}
                      height={160}
                      className="object-contain"
                    />
                    <p className="text-sm text-gray-600">Your cart is empty.</p>
                    <Link
                      href="/shop"
                      className="inline-flex justify-center rounded-full btn-primary px-6 py-3 text-xs sm:text-sm font-medium transition"
                      onClick={onClose}
                    >
                      Continue Shopping
                    </Link>
                  </div>
                ) : (
                  cart.map((item) => {
                    const product = products.find((p) => p.id === item.productId);
                    if (!product) return null;
                    const { sale } = getProductPrice(product);
                    const stock = product.stock ?? 999;
                    const atMax = item.quantity >= stock;
                    return (
                      <div key={`${item.productId}-${item.size}-${item.color}`} className="flex gap-3 text-xs sm:text-sm">
                        <div className="relative w-16 h-20 rounded overflow-hidden bg-gray-50">
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
                          <p className="font-medium text-gray-900">{toTitleCase(product.name)}</p>
                          <p className="text-xs text-gray-500">
                            {item.size ? `Size: ${item.size}` : "Standard"}
                            {item.color ? ` • ${item.color}` : ""}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              className="w-7 h-7 rounded-full btn-soft"
                              onClick={() => updateCartQuantity(item, Math.max(1, item.quantity - 1))}
                            >
                              -
                            </button>
                            <span className="text-xs sm:text-sm w-6 text-center">{item.quantity}</span>
                            <button
                              className={`w-7 h-7 rounded-full btn-soft ${atMax ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"}`}
                              onClick={() => updateCartQuantity(item, Math.min(stock, item.quantity + 1))}
                              disabled={atMax}
                            >
                              +
                            </button>
                            <button
                              className="ml-auto text-xs text-red-600 hover:text-red-700"
                              onClick={() => removeFromCart(item)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <p className="font-semibold text-gray-900">{formatCurrency(sale * item.quantity)}</p>
                          {product.stock !== undefined && (
                            <p className="text-xxs mt-1 text-rose-600">{product.stock - item.quantity > 0 ? (product.stock - item.quantity <= 5 ? `Only ${product.stock - item.quantity} left` : null) : "Out of stock"}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {cart.length > 0 && (
                <div className="border-t border-gray-100 px-4 sm:px-5 py-4 space-y-3">
                  <div className="flex justify-between text-sm sm:text-base font-semibold">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-full btn-primary px-6 py-3 text-xs sm:text-sm font-medium transition"
                    onClick={() => {
                      const problematic = cart.map((it) => {
                        const product = products.find((p) => p.id === it.productId);
                        return { item: it, product };
                      }).find((r) => (r.product?.stock ?? 999) < r.item.quantity);
                      if (problematic) {
                        setStockError(`Some items exceed available stock. Reduce quantity for "${problematic.product!.name}".`);
                        return;
                      }
                      onClose();
                      // navigate to shipping after close; using location push to avoid importing router here
                      window.location.href = '/shipping';
                    }}
                  >
                    Checkout
                  </button>
                  {stockError && <p className="mt-2 text-xs text-rose-600">{stockError}</p>}
                </div>
              )}
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
