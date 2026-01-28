"use client";

import { useState } from "react";
import CartDrawer from "../components/CartDrawer";

export default function TermsPage() {
  const [showCart, setShowCart] = useState(false);
  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-100 p-6 sm:p-8 glass-card">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Terms & Conditions</h1>
            <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
              By using SHIDS STYLE, you agree to our terms of service. All purchases are subject to availability and
              acceptance. Prices and product details may change without notice.
            </p>
            <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
              We reserve the right to refuse service, cancel orders, or limit quantities at our discretion. Please read
              the full policy details or contact support for clarification.
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
