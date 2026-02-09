"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import CartDrawer from "../components/CartDrawer";

export default function AboutPage() {
  const [showCart, setShowCart] = useState(false);

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-100 p-6 sm:p-8 glass-card">
            {/* Header */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
              About SHIDS STYLE
            </h1>

            {/* Grid: mobile stacks (image first), sm+ shows two columns (image left, text right) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              {/* IMAGE BLOCK: mobile first (order-1), sm+ first (sm:order-1) */}
              <div className="order-1 sm:order-1 flex justify-center sm:justify-start">
                <div
                  className="
                    relative
                    w-full
                    max-w-[280px]        /* mobile max width */
                    sm:max-w-[320px]     /* small screens */
                    md:max-w-[360px]     /* medium+ screens */
                    aspect-[3/4]         /* keeps consistent height/width ratio */
                    overflow-hidden
                    rounded-2xl
                    border border-black/30
                    bg-white
                    ring-1 ring-black/10
                    shadow-[0_18px_40px_rgba(15,23,42,0.18)]
                  "
                >
                  <Image
                    src="/s-v.jpg"
                    alt="Founder of SHIDS STYLE"
                    fill
                    sizes="(min-width: 1024px) 360px, (min-width: 768px) 320px, (min-width: 640px) 280px, 100vw"
                    className="object-contain object-center"
                    priority
                  />
                </div>
              </div>

              {/* TEXT BLOCK: mobile second (order-2), sm+ second (sm:order-2) */}
              <div className="order-2 sm:order-2 space-y-4 self-start">
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Shraddha Vajpayi is the founder behind SHIDS STYLE, crafting refined staples that balance comfort,
                  quality, and everyday confidence.
                </p>

                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  SHIDS STYLE is a modern fashion studio focused on elevated everyday essentials. We design timeless
                  silhouettes with premium materials, effortless fits, and a commitment to comfort and longevity.
                </p>

                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Our collections are curated for versatility—made to layer, mix, and move with you. We believe in
                  intentional craftsmanship, responsible production, and a shopping experience that feels as refined as
                  the garments themselves.
                </p>

                {/* Buttons */}
                <div className="pt-2 flex flex-wrap items-center justify-start gap-3">
                  <Link
                    href="/shop"
                    className="inline-flex rounded-full bg-black px-5 py-2.5 text-xs font-semibold !text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
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
