"use client";

import Link from "next/link";
import { useState } from "react";
import CartDrawer from "../components/CartDrawer";

export default function TermsPage() {
  const [showCart, setShowCart] = useState(false);
  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-100 p-6 sm:p-8 glass-card space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Terms & Conditions</h1>
            <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
              By using SHIDS STYLE, you agree to our terms of service. All purchases are subject to availability and
              acceptance. Prices and product details may change without notice.
            </p>
            <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
              We reserve the right to refuse service, cancel orders, or limit quantities at our discretion. Please read
              the full policy details or contact support for clarification.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/policy"
                className="inline-flex rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                View Policies
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
