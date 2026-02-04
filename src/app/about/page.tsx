"use client";

import Link from "next/link";
import { useState } from "react";
import CartDrawer from "../components/CartDrawer";

export default function AboutPage() {
  const [showCart, setShowCart] = useState(false);
  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-100 p-6 sm:p-8 glass-card space-y-4">
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
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/shop"
                className="inline-flex rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                Shop Collection
              </Link>
              <Link
                href="/contact"
                className="inline-flex rounded-full border border-gray-200 px-5 py-2.5 text-xs font-semibold text-gray-700 hover:border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
              >
                Contact Support
              </Link>
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
