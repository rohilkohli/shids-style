import { z } from "zod";

// ============================================================================
// Product Validation Schema
// ============================================================================

export const productSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, "Product name is required")
    .max(100, "Product name must be 100 characters or less"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  price: z
    .number({ message: "Price must be a number" })
    .positive("Price must be greater than 0"),
  originalPrice: z
    .number()
    .positive("Compare at price must be positive")
    .optional()
    .nullable(),
  discountPercent: z
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .optional()
    .nullable(),
  stock: z
    .number({ message: "Stock must be a number" })
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative"),
  colors: z.string().optional(),
  sizes: z.string().optional(),
  tags: z.string().optional(),
  highlights: z.string().optional(),
  images: z.string().min(1, "At least one image is required"),
  badge: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

// Step-specific validation
export const productStep0Schema = productSchema.pick({
  name: true,
  category: true,
});

export const productStep1Schema = productSchema.pick({
  price: true,
  originalPrice: true,
  discountPercent: true,
  stock: true,
});

export const productStep2Schema = productSchema.pick({
  description: true,
});

export const productStep3Schema = productSchema.pick({
  images: true,
});

// ============================================================================
// Discount Code Validation Schema
// ============================================================================

export const discountSchema = z.object({
  code: z
    .string()
    .min(1, "Discount code is required")
    .max(20, "Code must be 20 characters or less")
    .regex(/^[A-Z0-9_-]+$/i, "Code can only contain letters, numbers, hyphens, and underscores")
    .transform((val) => val.toUpperCase()),
  description: z.string().optional(),
  type: z.enum(["percentage", "fixed"]),
  value: z
    .number({ message: "Value must be a number" })
    .positive("Value must be greater than 0"),
  maxUses: z
    .number()
    .int("Max uses must be a whole number")
    .positive("Max uses must be positive")
    .optional()
    .nullable(),
  expiryDate: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === "percentage" && data.value > 100) {
      return false;
    }
    return true;
  },
  {
    message: "Percentage discount cannot exceed 100%",
    path: ["value"],
  }
);

export type DiscountFormData = z.infer<typeof discountSchema>;

// ============================================================================
// Category Validation Schema
// ============================================================================

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(50, "Category name must be 50 characters or less"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  featuredProductId: z.string().optional().nullable(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

// ============================================================================
// Hero Product Validation Schema
// ============================================================================

export const heroSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  position: z
    .number({ message: "Position must be a number" })
    .int("Position must be a whole number")
    .min(0, "Position cannot be negative"),
});

export type HeroFormData = z.infer<typeof heroSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate a single field and return error message if invalid
 */
export function validateField<T extends z.ZodType>(
  schema: T,
  value: unknown
): string | null {
  const result = schema.safeParse(value);
  if (!result.success) {
    return result.error.issues[0]?.message || "Invalid value";
  }
  return null;
}

/**
 * Check if form data is valid without throwing
 */
export function isFormValid<T extends z.ZodType>(
  schema: T,
  data: unknown
): boolean {
  return schema.safeParse(data).success;
}
