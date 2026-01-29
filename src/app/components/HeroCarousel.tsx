"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "../lib/types";
import { formatCurrency } from "../lib/utils";

export type HeroItem = {
  id: string | number;
  position: number;
  product: Product;
};

export default function HeroCarousel({ items }: { items: HeroItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slides = useMemo(() => items.filter((item) => item.product?.images?.length), [items]);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [slides.length, activeIndex]);

  if (!slides.length) {
    return null;
  }

  const current = slides[activeIndex];
  const product = current.product;

  return (
    <section
      className="relative h-[420px] sm:h-[620px] lg:h-[700px] bg-gray-50 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Link href={`/products/${product.slug}`} className="absolute inset-0">
        <img
          src={product.images[0]}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover transition duration-700"
        />
      </Link>
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

      <div className="absolute inset-0 flex items-end">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10 sm:pb-14 lg:pb-16 w-full">
          <div className="flex flex-col gap-4 sm:gap-5 items-center text-center text-white">
            <span className="text-xs uppercase tracking-[0.35em] text-white/80">Hero Pick</span>
            <h2 className="font-display text-3xl sm:text-5xl lg:text-7xl font-bold">{product.name}</h2>
            <p className="text-sm sm:text-base text-white/80 max-w-2xl">
              {product.description}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/products/${product.slug}`}
                className="rounded-full bg-white/95 text-gray-900 px-6 sm:px-8 py-3.5 text-sm sm:text-base font-semibold"
              >
                View Product · {formatCurrency(product.price)}
              </Link>
              <Link
                href="/shop"
                className="rounded-full border border-white/70 px-6 sm:px-8 py-3.5 text-sm sm:text-base font-semibold text-white hover:bg-white/10"
              >
                Shop Collection
              </Link>
            </div>
          </div>
        </div>
      </div>

      <button
        className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 text-gray-900 flex items-center justify-center shadow"
        onClick={(event) => {
          event.preventDefault();
          setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
        }}
        aria-label="Previous"
      >
        ‹
      </button>
      <button
        className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 text-gray-900 flex items-center justify-center shadow"
        onClick={(event) => {
          event.preventDefault();
          setActiveIndex((prev) => (prev + 1) % slides.length);
        }}
        aria-label="Next"
      >
        ›
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            onClick={(event) => {
              event.preventDefault();
              setActiveIndex(index);
            }}
            className={`h-2.5 w-2.5 rounded-full transition ${
              index === activeIndex ? "bg-white" : "bg-white/50"
            }`}
            aria-label={`Show ${slide.product.name}`}
          />
        ))}
      </div>
    </section>
  );
}
