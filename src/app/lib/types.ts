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
  colors: string[];
  sizes: string[];
  description: string;
  highlights: string[];
  images: string[];
};

export type CartItem = {
  productId: string;
  quantity: number;
  color?: string;
  size?: string;
};

export type OrderStatus = "pending" | "processing" | "paid" | "packed" | "fulfilled" | "shipped" | "cancelled";

export type Order = {
  id: string;
  items: CartItem[];
  subtotal?: number;
  shippingFee?: number;
  total: number;
  email: string;
  address: string;
  status: OrderStatus;
  createdAt: string;
  notes?: string;
  awbNumber?: string;
  paymentProof?: string;
  paymentVerified?: boolean;
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
};
