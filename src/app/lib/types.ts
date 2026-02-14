// [NEW] Define what a Variant looks like
export type Variant = {
  id: number;
  productId: string;
  size: string;
  color: string;
  stock: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  tags: string[];
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  stock: number;
  badge?: string;
  rating?: number;
  // [UPDATED] Colors now support objects { name, hex } or legacy strings
  colors: (string | { name: string; hex: string })[];
  sizes: string[];
  description: string;
  highlights: string[];
  images: string[];
  // [NEW] Add variants list to Product
  variants?: Variant[];
  // [NEW] Admin bestseller flag
  bestseller?: boolean;
  // [NEW] Numeric SKU (auto-generated if missing)
  sku?: string;
};

export type ProductColor = {
  name: string;
  hex: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  featuredProductId?: string;
  createdAt?: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
  color?: string;
  size?: string;
  // [NEW] Add variantId to CartItem
  variantId?: number;
};

export type OrderStatus = "pending" | "processing" | "paid" | "packed" | "fulfilled" | "shipped" | "cancelled";

export type Order = {
  id: string;
  items: CartItem[];
  subtotal?: number;
  shippingFee?: number;
  discountCode?: string;
  discountAmount?: number;
  total: number;
  email: string;
  address: string;
  status: OrderStatus;
  createdAt: string;
  notes?: string;
  awbNumber?: string;
  courierName?: string;
  paymentVerified?: boolean;
  trackingToken?: string; // For guest order tracking
  isGuest?: boolean;
};

export type Customer = {
  email: string;
  name?: string;
  totalOrders: number;
  totalSpent: number;
  orders: Order[];
};

export type DiscountCode = {
  id: string;
  code: string;
  description?: string;
  type: "percentage" | "fixed";
  value: number;
  maxUses?: number;
  usedCount: number;
  expiryDate?: string;
  isActive: boolean;
  createdAt: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  role?: "admin" | "customer";
};

// ============================================================================
// Review Types
// ============================================================================

export type Review = {
  id: string;
  productId: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  rating: number;
  title?: string;
  content: string;
  verified: boolean;
  helpful: number;
  images?: string[];
  createdAt: string;
  size?: string;
  fit?: "runs_small" | "true_to_size" | "runs_large";
};

export type ReviewStats = {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
};