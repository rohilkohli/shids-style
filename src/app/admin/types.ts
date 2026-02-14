// ============================================================================
// Admin Panel Shared Types
// ============================================================================

import type { Product, Order, Customer, Variant, ProductColor, OrderStatus, Category } from "@/app/lib/types";

export type AdminView =
  | "dashboard"
  | "products"
  | "orders"
  | "customers"
  | "ledger"
  | "discounts"
  | "hero"
  | "newsletter"
  | "contact"
  | "categories";

// Omit fields from Product that we want to treat as simple strings in the admin form
export type ProductFormState =
  Partial<Omit<Product, "colors" | "sizes" | "tags" | "highlights" | "images">> & {
  colors: ProductColor[]; // Now stores objects
  sizes: string; // Keep as comma-separated string for input convenience, parse later
  tags: string; // comma-separated for UI
  highlights: string; // semicolon-separated for UI
  images: string; // newline/comma separated for UI
  newColorName: string;
  newColorHex: string;
  variants: Variant[];
};

export type DiscountFormState = {
  code: string;
  description: string;
  type: "percentage" | "fixed";
  value: number;
  maxUses?: number;
  expiryDate: string;
};

export type HeroEntry = {
  id: number;
  position: number;
  product_id: string;
  product: Product;
};

export type NewsletterEntry = {
  id: number;
  email: string;
  created_at: string;
};

export type ContactMessage = {
  id: number;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

export type ProfileSummary = {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  role?: "admin" | "customer" | null;
  createdAt?: string | null;
};

// Re-export for convenience
export type { Product, Order, OrderStatus, Category, Customer };
