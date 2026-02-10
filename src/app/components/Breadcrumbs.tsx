"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "../lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link
            href="/"
            className="flex items-center text-gray-500 transition-colors hover:text-gray-900"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <ChevronRight className="h-4 w-4 text-gray-400" />
            {item.href && index < items.length - 1 ? (
              <Link
                href={item.href}
                className="text-gray-500 transition-colors hover:text-gray-900"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-gray-900">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Predefined breadcrumb configurations for common pages
export const breadcrumbConfigs = {
  shop: [{ label: "Shop" }],
  product: (name: string, category?: string) => [
    { label: "Shop", href: "/shop" },
    ...(category ? [{ label: category, href: `/shop?category=${encodeURIComponent(category)}` }] : []),
    { label: name },
  ],
  cart: [{ label: "Cart" }],
  checkout: [
    { label: "Cart", href: "/cart" },
    { label: "Checkout" },
  ],
  shipping: [
    { label: "Cart", href: "/cart" },
    { label: "Shipping" },
  ],
  payment: [
    { label: "Cart", href: "/cart" },
    { label: "Payment" },
  ],
  confirmation: [{ label: "Order Confirmation" }],
  account: [{ label: "My Account" }],
  orders: [
    { label: "My Account", href: "/account" },
    { label: "Orders" },
  ],
  orderDetail: (orderId: string) => [
    { label: "My Account", href: "/account" },
    { label: "Orders", href: "/account" },
    { label: `Order #${orderId.slice(0, 8)}` },
  ],
  track: [{ label: "Track Order" }],
  contact: [{ label: "Contact Us" }],
  about: [{ label: "About Us" }],
  returnsPolicy: [{ label: "Returns Policy" }],
  shippingPolicy: [{ label: "Shipping Policy" }],
  refundPolicy: [{ label: "Refund Policy" }],
  terms: [{ label: "Terms & Conditions" }],
  privacy: [{ label: "Privacy Policy" }],
  login: [{ label: "Login" }],
  register: [{ label: "Create Account" }],
  wishlist: [{ label: "Wishlist" }],
  recentlyViewed: [{ label: "Recently Viewed" }],
  admin: [{ label: "Admin Dashboard" }],
};
