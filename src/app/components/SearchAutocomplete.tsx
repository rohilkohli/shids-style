"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { useCommerceStore, getProductPrice } from "@/app/lib/store";
import { formatCurrency, toTitleCase } from "@/app/lib/utils";
import type { Product } from "@/app/lib/types";

interface SearchAutocompleteProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  showTrending?: boolean;
}

const RECENT_SEARCHES_KEY = "shids_recent_searches";
const MAX_RECENT_SEARCHES = 5;
const MAX_SUGGESTIONS = 6;

// Popular/trending searches (can be made dynamic later)
const TRENDING_SEARCHES = [
  "summer dress",
  "cotton shirt",
  "denim",
  "oversized",
  "printed tee",
];

export function SearchAutocomplete({
  onSearch,
  placeholder = "Search products...",
  className = "",
  showTrending = true,
}: SearchAutocompleteProps) {
  const router = useRouter();
  const { products } = useCommerceStore();
  const [query, setQueryState] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownId = "search-autocomplete-dropdown";
  const isInitializedRef = useRef(false);

  // Wrapper for setQuery that also resets highlightedIndex
  const setQuery = useCallback((newQuery: string | ((prev: string) => string)) => {
    setQueryState(newQuery);
    setHighlightedIndex(-1);
  }, []);

  // Load recent searches from localStorage on mount (only once)
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Use requestAnimationFrame to defer state update
    requestAnimationFrame(() => {
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentSearches(parsed);
          }
        }
      } catch {
        // Ignore localStorage errors
      }
    });
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== normalized);
      const updated = [searchQuery.trim(), ...filtered].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  }, []);

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore localStorage errors
    }
  };

  // Filter products based on query
  const suggestions = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    const normalizedQuery = query.toLowerCase();
    return products
      .filter((product) => {
        const nameMatch = product.name.toLowerCase().includes(normalizedQuery);
        const categoryMatch = product.category.toLowerCase().includes(normalizedQuery);
        const tagMatch = product.tags.some((tag) =>
          tag.toLowerCase().includes(normalizedQuery)
        );
        return nameMatch || categoryMatch || tagMatch;
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [query, products]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = suggestions.length;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelectProduct(suggestions[highlightedIndex]);
        } else if (query.trim()) {
          handleSearch(query);
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSearch = (searchQuery: string) => {
    saveRecentSearch(searchQuery);
    onSearch?.(searchQuery);
    setIsOpen(false);
  };

  const handleSelectProduct = (product: Product) => {
    saveRecentSearch(product.name);
    setIsOpen(false);
    // Navigate to product page
    router.push(`/products/${product.slug}`);
  };

  const handleSuggestionClick = (searchText: string) => {
    setQuery(searchText);
    handleSearch(searchText);
  };

  const showDropdown = isOpen && (!!query.trim() || recentSearches.length > 0 || showTrending);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-full border border-gray-200 bg-white py-3 pl-12 pr-10 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5 transition"
          aria-label="Search products"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls={dropdownId}
          role="combobox"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div id={dropdownId} className="absolute top-full left-0 right-0 z-50 mt-2 rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200" role="listbox">
          {/* Product Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Products
              </p>
              {suggestions.map((product, idx) => {
                const { sale, compareAt } = getProductPrice(product);
                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    onClick={() => saveRecentSearch(product.name)}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${highlightedIndex === idx
                        ? "bg-gray-100"
                        : "hover:bg-gray-50"
                      }`}
                  >
                    <div className="relative h-14 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      <Image
                        src={product.images?.[0] ?? "/file.svg"}
                        alt={product.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {toTitleCase(product.name)}
                      </p>
                      <p className="text-xs text-gray-500">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(sale)}
                      </p>
                      {compareAt !== sale && (
                        <p className="text-xs text-gray-400 line-through">
                          {formatCurrency(compareAt)}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
              {query.trim() && (
                <button
                  onClick={() => handleSearch(query)}
                  className="w-full flex items-center justify-center gap-2 p-3 mt-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  See all results for &ldquo;{query}&rdquo;
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* No Results */}
          {query.trim() && suggestions.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500">
                No products found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Try a different search term
              </p>
            </div>
          )}

          {/* Recent Searches */}
          {!query.trim() && recentSearches.length > 0 && (
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Recent Searches
                </p>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear all
                </button>
              </div>
              {recentSearches.map((search, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(search)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <Clock className="h-4 w-4 text-gray-400" />
                  {search}
                </button>
              ))}
            </div>
          )}

          {/* Trending Searches */}
          {!query.trim() && showTrending && (
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Trending
              </p>
              <div className="flex flex-wrap gap-2 px-3 pb-2">
                {TRENDING_SEARCHES.map((search, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(search)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
