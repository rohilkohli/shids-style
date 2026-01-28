"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCommerceStore } from "../lib/store";
import CartDrawer from "./CartDrawer";

export default function Navbar() {
  const router = useRouter();
  const { user, cart, wishlist } = useCommerceStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchClosing, setSearchClosing] = useState(false);
  const [query, setQuery] = useState("");
  const [spinClose, setSpinClose] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const wishlistCount = useMemo(() => wishlist.length, [wishlist]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!searchWrapperRef.current?.contains(event.target as Node)) {
        if (!query.trim()) {
          setSearchOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [query]);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-black">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2">
            <button
              className="inline-flex sm:hidden h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-50"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <span className="relative w-5 h-4">
                <span className="absolute left-0 top-0 h-0.5 w-5 bg-gray-800 rounded" />
                <span className="absolute left-0 top-2 h-0.5 w-5 bg-gray-800 rounded" />
                <span className="absolute left-0 top-4 h-0.5 w-5 bg-gray-800 rounded" />
              </span>
            </button>
            <Link href="/" className="text-lg sm:text-xl font-display font-bold text-gray-900">
              SHIDS STYLE
            </Link>
          </div>

          <nav className="hidden sm:flex items-center gap-5 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-gray-900">Home</Link>
            <Link href="/shop" className="hover:text-gray-900">Collection</Link>
            <Link href="/contact" className="hover:text-gray-900">Contact</Link>
          </nav>

          <div className="flex items-center gap-2">
            <div
              className={`hidden sm:flex items-center h-10 rounded-full transition-all duration-300 border border-transparent ${
                searchOpen || searchClosing ? "w-48 bg-gray-200/80 border-gray-200 shadow px-3" : "w-10 px-2 bg-transparent justify-center"
              }`}
              onClick={() => {
                setSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 0);
              }}
              role="button"
              aria-label="Search"
              ref={searchWrapperRef}
            >
              <span className="text-gray-600 flex-shrink-0">
                <img src="/search-interface-symbol.png" alt="Search" className="h-5 w-5 icon-dark opacity-100" />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className={`ml-2 w-full bg-transparent text-sm text-gray-700 placeholder-gray-500 outline-none transition-opacity ${
                  searchOpen || searchClosing ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                placeholder="Search..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    router.push(`/shop?search=${encodeURIComponent(query.trim())}`);
                    setSearchOpen(false);
                  }
                }}
              />
              <button
                type="button"
                className={`ml-1 h-7 w-7 flex items-center justify-center rounded-full text-gray-600 hover:text-gray-900 ${
                  searchOpen || searchClosing ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  setSpinClose(true);
                  setQuery("");
                  setSearchClosing(true);
                  setTimeout(() => {
                    setSearchOpen(false);
                    setSearchClosing(false);
                    setSpinClose(false);
                  }, 280);
                }}
                aria-label="Clear search"
              >
                <span className={`relative w-3.5 h-3.5 ${spinClose ? "spin-once" : ""}`}>
                  <span className="absolute left-0 top-1/2 h-0.5 w-3.5 -translate-y-1/2 rotate-45 bg-current rounded" />
                  <span className="absolute left-0 top-1/2 h-0.5 w-3.5 -translate-y-1/2 -rotate-45 bg-current rounded" />
                </span>
              </button>
            </div>
            <Link
              href={user ? "/account" : "/login"}
              className="h-10 w-10 flex items-center justify-center text-gray-600 hover:text-gray-900"
              aria-label="Profile"
            >
              <img src="/profile-icon.png" alt="Profile" className="h-5 w-5" />
            </Link>
            <Link
              href="/wishlist"
              className="relative h-10 w-10 flex items-center justify-center text-gray-600 hover:text-gray-900"
              aria-label="Wishlist"
            >
              <img src="/wishlist-icon.png" alt="Wishlist" className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[color:var(--primary)] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <button
              className="relative h-10 w-10 flex items-center justify-center text-gray-600 hover:text-gray-900"
              onClick={() => setShowCart(true)}
              aria-label="Cart"
            >
              <img src="/shopping-bag.png" alt="Cart" className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[color:var(--primary)] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[min(80vw,300px)] bg-white shadow-2xl border-r border-gray-100">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="text-xs uppercase tracking-[0.25em] text-gray-500 font-semibold">Menu</p>
              <button
                className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <span className="relative w-4 h-4">
                  <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 rotate-45 bg-gray-800 rounded" />
                  <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 -rotate-45 bg-gray-800 rounded" />
                </span>
              </button>
            </div>
            <div className="px-5 py-4 space-y-2 text-sm">
              <Link href="/" className="block rounded-lg px-3 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                Home
              </Link>
              <Link href="/shop" className="block rounded-lg px-3 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                Shop
              </Link>
              <Link href="/contact" className="block rounded-lg px-3 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                Contact
              </Link>
              <Link href="/about" className="block rounded-lg px-3 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                About
              </Link>
              <Link href="/wishlist" className="block rounded-lg px-3 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                Wishlist
              </Link>
              <Link href="/recently-viewed" className="block rounded-lg px-3 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                Recently Viewed
              </Link>
              <Link href="/returns-policy" className="block rounded-lg px-3 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                Returns Policy
              </Link>
              <Link href="/refund-policy" className="block rounded-lg px-3 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                Refund Policy
              </Link>
              <Link href="/shipping-policy" className="block rounded-lg px-3 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                Shipping Policy
              </Link>
              <Link href="/policy" className="block rounded-lg px-3 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                Privacy Policy
              </Link>
              <Link
                href={user ? "/account" : "/login"}
                className="block rounded-lg px-3 py-2 hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                {user ? "Account" : "Login"}
              </Link>
              <button
                className="w-full text-left rounded-lg px-3 py-2 hover:bg-gray-50"
                onClick={() => {
                  setMenuOpen(false);
                  setShowCart(true);
                }}
              >
                Cart
              </button>
            </div>
          </aside>
        </div>
      )}

      <CartDrawer isOpen={showCart} onOpen={() => setShowCart(true)} onClose={() => setShowCart(false)} hideTrigger />
    </header>
  );
}
