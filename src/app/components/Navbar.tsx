"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCommerceStore, getProductPrice } from "../lib/store";
import { formatCurrency, toTitleCase } from "../lib/utils";
import CartDrawer from "./CartDrawer";
import { Clock, TrendingUp, ArrowRight } from "lucide-react";

// Recent searches constants
const RECENT_SEARCHES_KEY = "shids_recent_searches";
const MAX_RECENT_SEARCHES = 3;
const MAX_SUGGESTIONS = 5;

// Popular/trending searches
const TRENDING_SEARCHES = [
  "summer dress",
  "cotton shirt",
  "denim",
  "oversized",
];

export default function Navbar() {
  const router = useRouter();
  const { user, cart, wishlist, products } = useCommerceStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchClosing, setSearchClosing] = useState(false);
  const [query, setQuery] = useState("");
  const [spinClose, setSpinClose] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const wishlistCount = useMemo(() => wishlist.length, [wishlist]);

  // Load recent searches
  useEffect(() => {
    // Defer setting mounted and reading localStorage to avoid synchronous setState inside effect
    requestAnimationFrame(() => {
      setMounted(true);
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch {
        // Ignore
      }
    });
  }, []);

  const saveRecentSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    setRecentSearches(prev => {
      const updated = [term, ...prev.filter(s => s !== term)].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  // Filter suggestions
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const normalized = query.toLowerCase();
    return products
      .filter(p =>
        p.name.toLowerCase().includes(normalized) ||
        p.category.toLowerCase().includes(normalized) ||
        p.tags.some(t => t.toLowerCase().includes(normalized))
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [query, products]);

  const handleSearch = (term: string) => {
    if (!term.trim()) return;
    saveRecentSearch(term);
    router.push(`/shop?search=${encodeURIComponent(term.trim())}`);
    setSearchOpen(false);
    setQuery("");
  };

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

  // Enhanced closing logic
  const handleCloseSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSpinClose(true);
    setSearchClosing(true);
    // Start shrinking immediately after a short delay for the spin to start
    setTimeout(() => {
      setSearchOpen(false);
      setSearchClosing(false);
      setSpinClose(false);
      setQuery("");
    }, 200); // Reduced from 280ms for snappier feel
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white sm:bg-white/95 sm:backdrop-blur-sm border-b border-black transition-colors duration-200">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-16">
            <div className="flex items-center gap-2">
              <button
                className={`inline-flex sm:hidden h-10 w-10 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 ${menuOpen ? "bg-gray-100" : "hover:bg-gray-50"
                  }`}
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
              >
                <span className="relative w-5 h-5">
                  <span
                    className={`absolute left-0 top-0 h-0.5 w-5 bg-gray-900 rounded transition-all duration-300 ${menuOpen ? "translate-y-2 rotate-45" : "translate-y-0 rotate-0"
                      }`}
                  />
                  <span
                    className={`absolute left-0 top-2 h-0.5 w-5 bg-gray-900 rounded transition-all duration-300 ${menuOpen ? "opacity-0" : "opacity-100"
                      }`}
                  />
                  <span
                    className={`absolute left-0 top-4 h-0.5 w-5 bg-gray-900 rounded transition-all duration-300 ${menuOpen ? "-translate-y-2 -rotate-45" : "translate-y-0 rotate-0"
                      }`}
                  />
                </span>
              </button>
              <Link
                href="/"
                className="flex items-center h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 rounded"
              >
                <Image
                  src="/typographic-logo-shids.svg"
                  alt="Shids Style"
                  width={220}
                  height={36}
                  priority
                  className="h-8 sm:h-10 w-auto max-w-[170px] sm:max-w-[220px] object-contain block"
                />
              </Link>
            </div>

            <nav className="hidden sm:flex items-center gap-5 text-sm font-medium text-gray-600">
              <Link href="/" className="hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 rounded">Home</Link>
              <Link href="/shop" className="hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 rounded">Collection</Link>
              <Link href="/track" className="hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 rounded">Track Order</Link>
              <Link href="/contact" className="hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 rounded">Contact</Link>
            </nav>

            <div className="flex items-center gap-2">
              <div
                className={`relative hidden sm:flex items-center h-10 rounded-full transition-all duration-300 border border-transparent ${searchOpen || searchClosing ? "w-64 bg-gray-100 border-gray-200 shadow-sm px-3" : "w-10 px-2 bg-transparent justify-center"
                  }`}
                onClick={() => {
                  if (!searchOpen) {
                    setSearchOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }
                }}
                role="button"
                aria-label="Search"
                aria-expanded={searchOpen || searchClosing}
                ref={searchWrapperRef}
              >
                <span className="text-gray-600 flex-shrink-0">
                  <Image
                    src="/search-interface-symbol.png"
                    alt="Search"
                    width={20}
                    height={20}
                    className="h-5 w-5 opacity-100"
                  />
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  className={`ml-2 w-full bg-transparent text-sm text-gray-700 placeholder-gray-500 outline-none transition-opacity duration-200 ${searchOpen || searchClosing ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  placeholder="Search products..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearch(query);
                    }
                  }}
                />
                <button
                  type="button"
                  className={`ml-1 h-7 w-7 flex items-center justify-center rounded-full text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 transition-opacity duration-200 ${searchOpen || searchClosing ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  onClick={handleCloseSearch}
                  aria-label="Clear search"
                >
                  <span className={`relative w-3.5 h-3.5 ${spinClose ? "spin-once" : ""}`}>
                    <span className="absolute left-0 top-1/2 h-0.5 w-3.5 -translate-y-1/2 rotate-45 bg-current rounded" />
                    <span className="absolute left-0 top-1/2 h-0.5 w-3.5 -translate-y-1/2 -rotate-45 bg-current rounded" />
                  </span>
                </button>

                {/* Search Dropdown */}
                {searchOpen && (query || recentSearches.length > 0) && (
                  <div className="absolute top-full right-0 mt-3 w-80 rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {query ? (
                      suggestions.length > 0 ? (
                        <div className="p-2">
                          <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Products</p>
                          {suggestions.map(product => {
                            const { sale } = getProductPrice(product);
                            return (
                              <Link
                                key={product.id}
                                href={`/products/${product.slug}`}
                                onClick={() => {
                                  saveRecentSearch(product.name);
                                  setSearchOpen(false);
                                  setQuery("");
                                }}
                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors"
                              >
                                <div className="relative h-12 w-9 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                  <Image
                                    src={product.images?.[0] || "/file.svg"}
                                    alt={product.name}
                                    fill
                                    sizes="36px"
                                    className="object-contain"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{toTitleCase(product.name)}</p>
                                  <p className="text-xs text-gray-500">{product.category}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(sale)}</span>
                                </div>
                              </Link>
                            );
                          })}
                          <button
                            onClick={() => handleSearch(query)}
                            className="w-full mt-1 flex items-center justify-center gap-2 p-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl"
                          >
                            See all results <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-sm text-gray-500">No products found</div>
                      )
                    ) : (
                      <>
                        {recentSearches.length > 0 && (
                          <div className="p-2 border-b border-gray-100">
                            <div className="flex items-center justify-between px-3 py-2">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                <Clock className="h-3 w-3" /> Recent
                              </p>
                              <button onClick={clearRecentSearches} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
                            </div>
                            {recentSearches.map((term, i) => (
                              <button
                                key={i}
                                onClick={() => handleSearch(term)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg text-left"
                              >
                                <Clock className="h-3.5 w-3.5 text-gray-400" />
                                {term}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="p-2">
                          <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                            <TrendingUp className="h-3 w-3" /> Trending
                          </p>
                          <div className="flex flex-wrap gap-2 px-3 pb-2">
                            {TRENDING_SEARCHES.map(term => (
                              <button
                                key={term}
                                onClick={() => handleSearch(term)}
                                className="px-3 py-1 text-xs font-medium bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                              >
                                {term}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <Link
                href={mounted && user ? "/account" : "/login"}
                className="h-10 w-10 flex items-center justify-center text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 rounded-full"
                aria-label="Profile"
              >
                <Image src="/profile-icon.png" alt="Profile" width={20} height={20} className="h-5 w-5" />
              </Link>
              <Link
                href="/wishlist"
                className="relative h-10 w-10 flex items-center justify-center text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 rounded-full"
                aria-label="Wishlist"
              >
                <Image src="/wishlist-icon.png" alt="Wishlist" width={20} height={20} className="h-5 w-5" />
                {mounted && wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[color:var(--primary)] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <button
                className="relative h-10 w-10 flex items-center justify-center text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 rounded-full"
                onClick={() => setShowCart(true)}
                aria-label="Cart"
              >
                <Image src="/shopping-bag.png" alt="Cart" width={20} height={20} className="h-5 w-5" />
                {mounted && cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[color:var(--primary)] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <div className="fixed left-0 right-0 bottom-0 top-16 z-40 bg-black/40 sm:hidden" onClick={() => setMenuOpen(false)} />

          <aside className="fixed left-0 top-16 h-[calc(100%-4rem)] w-[min(86vw,340px)] z-50 bg-white shadow-2xl border-r border-gray-200 flex flex-col transition-colors duration-200 sm:hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/20">
              <p className="text-[11px] uppercase tracking-[0.35em] text-black font-semibold">Menu</p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-2 text-sm text-gray-900">
              {[
                { href: "/", label: "Home" },
                { href: "/shop", label: "Shop" },
                { href: "/track", label: "Track Order" },
                { href: "/contact", label: "Contact" },
                { href: "/about", label: "About Us" },
                { href: "/wishlist", label: "Wishlist", icon: "heart" },
                { href: "/recently-viewed", label: "Recently Viewed", icon: "clock" },
                { href: "/returns-policy", label: "Returns Policy" },
                { href: "/refund-policy", label: "Refund Policy" },
                { href: "/shipping-policy", label: "Shipping Policy" },
                { href: "/policy", label: "Privacy Policy" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 py-3 border-b border-black/20"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.icon === "clock" && (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 6v6l4 2" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                  )}
                  {item.icon === "heart" && (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
                    </svg>
                  )}
                  <span>{item.label}</span>
                </Link>
              ))}
              <button
                className="w-full text-left py-3 border-b border-black/20"
                onClick={() => {
                  setMenuOpen(false);
                  setShowCart(true);
                }}
              >
                Cart
              </button>

              <div className="mt-6">
                <p className="text-lg font-semibold text-gray-900">My Account</p>
                <div className="mt-3 grid gap-3">
                  <Link
                    href={user ? "/account" : "/login"}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-semibold !text-black border-b btn-outline"
                    onClick={() => setMenuOpen(false)}
                  >
                    {user ? "Account" : "Login"}
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex w-full items-center justify-center rounded-lg bg-black px-4 py-3 text-sm font-semibold !text-white hover:!text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      <CartDrawer isOpen={showCart} onOpen={() => setShowCart(true)} onClose={() => setShowCart(false)} hideTrigger />
    </>
  );
}