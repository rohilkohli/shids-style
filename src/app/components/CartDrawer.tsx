"use client";

import Link from "next/link";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import { getProductPrice, useCommerceStore } from "../lib/store";
import { formatCurrency } from "../lib/utils";

type CartDrawerProps = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  hideTrigger?: boolean;
};

export default function CartDrawer({ isOpen, onOpen, onClose, hideTrigger = false }: CartDrawerProps) {
  const { cart, products, updateCartQuantity, removeFromCart } = useCommerceStore();
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
              className="absolute right-0 top-0 h-full w-full sm:w-[360px] md:w-[400px] bg-white shadow-2xl border-l border-gray-200"
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
                    <img
                      src="/empty-cart.png"
                      alt="Empty cart"
                      className="w-40 h-40 object-contain"
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
                    return (
                      <div key={`${item.productId}-${item.size}-${item.color}`} className="flex gap-3 text-xs sm:text-sm">
                        <img src={product.images[0]} alt={product.name} className="w-16 h-20 object-cover rounded" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{product.name}</p>
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
                              className="w-7 h-7 rounded-full btn-soft"
                              onClick={() => updateCartQuantity(item, item.quantity + 1)}
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
                        <p className="font-semibold text-gray-900">{formatCurrency(sale * item.quantity)}</p>
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
                  <Link
                    href="/shipping"
                    className="w-full inline-flex justify-center rounded-full btn-primary px-6 py-3 text-xs sm:text-sm font-medium transition"
                    onClick={onClose}
                  >
                    Checkout
                  </Link>
                </div>
              )}
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
