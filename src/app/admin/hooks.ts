"use client";

import { useForm, UseFormReturn, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, discountSchema, ProductFormData, DiscountFormData } from "./validation";

// ============================================================================
// Product Form Hook
// ============================================================================

export type ProductFormReturn = UseFormReturn<ProductFormData>;

export function useProductForm(defaultValues?: Partial<ProductFormData>) {
  return useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      price: 0,
      originalPrice: undefined,
      discountPercent: 0,
      stock: 0,
      colors: "",
      sizes: "",
      tags: "",
      highlights: "",
      images: "",
      badge: "",
      ...defaultValues,
    },
    mode: "onBlur",
  });
}

// ============================================================================
// Discount Form Hook
// ============================================================================

export type DiscountFormReturn = UseFormReturn<DiscountFormData>;

export function useDiscountForm(defaultValues?: Partial<DiscountFormData>) {
  return useForm<DiscountFormData>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      code: "",
      description: "",
      type: "percentage",
      value: 0,
      maxUses: undefined,
      expiryDate: "",
      ...defaultValues,
    },
    mode: "onBlur",
  });
}

// ============================================================================
// Form Error Helper
// ============================================================================

/**
 * Get the first error message from form errors
 */
export function getFirstError(errors: FieldErrors): string | null {
  const keys = Object.keys(errors);
  if (keys.length === 0) return null;
  
  const firstKey = keys[0];
  const error = errors[firstKey];
  
  if (error && typeof error.message === "string") {
    return error.message;
  }
  
  return "Please check the form for errors";
}

/**
 * Check if a specific field has an error
 */
export function hasFieldError(errors: FieldErrors, field: string): boolean {
  return field in errors;
}

/**
 * Get error message for a specific field
 */
export function getFieldError(errors: FieldErrors, field: string): string | undefined {
  const error = errors[field];
  if (error && typeof error.message === "string") {
    return error.message;
  }
  return undefined;
}
