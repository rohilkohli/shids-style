"use client";

import { useState } from "react";
import CartDrawer from "../components/CartDrawer";

export default function PolicyPage() {
  const [showCart, setShowCart] = useState(false);
  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-100 p-6 sm:p-8 glass-card space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shipping & Return Policy</h1>
              <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                Orders are processed within 1-3 business days. Delivery timelines depend on location and carrier
                availability. You will receive a tracking link once your order ships.
              </p>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Returns</h2>
              <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed">
                Returns are accepted within 7 days of delivery for unused items in original packaging. To initiate a
                return, contact support with your order ID and reason for return.
              </p>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Exchanges</h2>
              <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed">
                Exchange requests are handled based on stock availability. If the requested item is unavailable, a
                refund will be issued to your original payment method.
              </p>
            </div>
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
