"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "../lib/types";

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

  if (!slides.length) {
    return null;
  }

  const safeIndex = slides.length ? activeIndex % slides.length : 0;
  return (
    <section
      className="relative h-[320px] sm:h-[560px] lg:h-[700px] bg-gray-50 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Hero carousel"
    >
      {slides.map((slide, index) => (
        <Link
          key={slide.id}
          href={`/products/${slide.product.slug}`}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === safeIndex ? "opacity-100" : "opacity-0"
          }`}
          tabIndex={index === safeIndex ? 0 : -1}
          aria-hidden={index !== safeIndex}
        >
          <Image
            src={slide.product.images?.[0] ?? "/file.svg"}
            alt={slide.product.name}
            fill
            priority={index === safeIndex}
            sizes="100vw"
            quality={85}
            className="absolute inset-0 object-cover object-center"
          />
        </Link>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent pointer-events-none" />

      <button
        type="button"
        className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/80 text-gray-900 flex items-center justify-center shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        onClick={(event) => {
          event.preventDefault();
          setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
        }}
        aria-label="Previous"
      >
        ‹
      </button>
      <button
        type="button"
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/80 text-gray-900 flex items-center justify-center shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
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
            type="button"
            key={slide.id}
            onClick={(event) => {
              event.preventDefault();
              setActiveIndex(index);
            }}
            className={`h-2.5 w-2.5 rounded-full transition ${
              index === safeIndex ? "bg-white" : "bg-white/50"
            }`}
            aria-label={`Show ${slide.product.name}`}
            aria-current={index === safeIndex}
          />
        ))}
      </div>
    </section>
  );
}
