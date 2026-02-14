"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

interface ImageZoomProps {
  src: string;
  alt: string;
  badge?: string;
  zoomScale?: number;
}

export function ImageZoom({ src, alt, badge, zoomScale = 2.5 }: ImageZoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isZooming, setIsZooming] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPosition({ x, y });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsZooming(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsZooming(false);
    setPosition({ x: 50, y: 50 });
  }, []);

  return (
    <div
      ref={containerRef}
      className="aspect-[4/5] relative bg-gray-100 rounded-2xl overflow-hidden shadow-lg cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {badge && (
        <div className="absolute top-4 left-4 bg-black text-white text-xs font-bold px-3 py-1 uppercase tracking-widest z-10">
          {badge}
        </div>
      )}
      
      {/* Zoom indicator */}
      <div 
        className={`absolute bottom-4 right-4 z-10 transition-opacity duration-200 ${
          isZooming ? "opacity-0" : "opacity-100"
        }`}
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 text-gray-900 text-xs font-medium rounded-full shadow-md backdrop-blur-sm">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
            <path d="M11 8v6M8 11h6" />
          </svg>
          Hover to zoom
        </span>
      </div>

      {/* Normal image */}
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className={`object-cover transition-opacity duration-300 ${
          isZooming ? "opacity-0" : "opacity-100"
        }`}
        priority
      />

      {/* Zoomed image */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          isZooming ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: `${zoomScale * 100}%`,
          backgroundPosition: `${position.x}% ${position.y}%`,
          backgroundRepeat: "no-repeat",
        }}
      />
    </div>
  );
}
