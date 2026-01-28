"use client";

import { useState } from "react";
import CartDrawer from "../components/CartDrawer";

export default function AboutPage() {
  const [showCart, setShowCart] = useState(false);
  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-100 p-6 sm:p-8 glass-card">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">About SHIDS STYLE</h1>
            <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
              SHIDS STYLE is a modern fashion studio focused on elevated everyday essentials. We design timeless
              silhouettes with premium materials, effortless fits, and a commitment to comfort and longevity.
            </p>
            <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
              Our collections are curated for versatility—made to layer, mix, and move with you. We believe in
              intentional craftsmanship, responsible production, and a shopping experience that feels as refined as
              the garments themselves.
            </p>
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
