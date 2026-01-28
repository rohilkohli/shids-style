"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultOrders, defaultProducts } from "./data";
import { CartItem, Order, OrderStatus, Product, DiscountCode, User } from "./types";
import { formatCurrency, slugify } from "./utils";

const STORAGE_KEY = "shids-style/state/v1";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getVariantKey = (item: CartItem) => `${item.productId}-${item.color ?? ""}-${item.size ?? ""}`;

export const getProductPrice = (product: Product) => {
  const sale = product.discountPercent
    ? Number((product.price * (1 - product.discountPercent / 100)).toFixed(2))
    : product.price;
  const compareAt = product.originalPrice ?? product.price;
  return { sale, compareAt };
};

export type CreateOrderPayload = {
  email: string;
  address: string;
  notes?: string;
  paymentProof?: string;
  shippingFee?: number;
};

type PersistedState = {
  products: Product[];
  orders: Order[];
  cart: CartItem[];
  wishlist: string[];
  discountCodes: DiscountCode[];
  user?: User | null;
  recentlyViewed: string[];
};

const initialState: PersistedState = {
  products: defaultProducts,
  orders: defaultOrders,
  cart: [],
  wishlist: [],
  discountCodes: [],
  user: null,
  recentlyViewed: [],
};

export function useCommerceStore() {
  const instanceIdRef = useRef(`inst-${Date.now()}-${Math.random()}`);
  const suppressBroadcastRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<Product[]>(defaultProducts);
  const [orders, setOrders] = useState<Order[]>(defaultOrders);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        setProducts(parsed.products?.length ? parsed.products : defaultProducts);
        setOrders(parsed.orders?.length ? parsed.orders : defaultOrders);
        setCart(parsed.cart ?? []);
        setWishlist(parsed.wishlist ?? []);
        setDiscountCodes(parsed.discountCodes ?? []);
        setUser(parsed.user ?? null);
        setRecentlyViewed(parsed.recentlyViewed ?? []);
      } catch (error) {
        console.warn("Failed to read stored state", error);
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ sourceId: string; state: PersistedState }>;
      if (!custom.detail || custom.detail.sourceId === instanceIdRef.current) return;
      const incoming = custom.detail.state;
      if (!incoming) return;
      suppressBroadcastRef.current = true;
      setProducts(incoming.products?.length ? incoming.products : defaultProducts);
      setOrders(incoming.orders?.length ? incoming.orders : defaultOrders);
      setCart(incoming.cart ?? []);
      setWishlist(incoming.wishlist ?? []);
      setDiscountCodes(incoming.discountCodes ?? []);
      setUser(incoming.user ?? null);
      setRecentlyViewed(incoming.recentlyViewed ?? []);
    };
    window.addEventListener("shids-state", handler as EventListener);
    return () => window.removeEventListener("shids-state", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const nextState: PersistedState = { products, orders, cart, wishlist, discountCodes, user, recentlyViewed };
    if (suppressBroadcastRef.current) {
      suppressBroadcastRef.current = false;
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    window.dispatchEvent(
      new CustomEvent("shids-state", {
        detail: { sourceId: instanceIdRef.current, state: nextState },
      })
    );
  }, [products, orders, cart, wishlist, discountCodes, user, recentlyViewed, ready]);

  const addRecentlyViewed = useCallback((productId: string) => {
    setRecentlyViewed((prev: string[]) => {
      const next = [productId, ...prev.filter((id) => id !== productId)];
      return next.slice(0, 12);
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => setRecentlyViewed([]), []);

  const signIn = (payload: { email: string; name?: string; phone?: string }) => {
    const nextUser: User = {
      id: user?.id ?? `USER-${Date.now()}`,
      email: payload.email.trim().toLowerCase(),
      name: payload.name?.trim() || "SHIDS Member",
      phone: payload.phone?.trim() || undefined,
    };
    setUser(nextUser);
    return nextUser;
  };

  const signOut = () => setUser(null);

  const updateUser = (updates: Partial<Omit<User, "id">>) => {
    if (!user) return null;
    const nextUser: User = {
      ...user,
      ...updates,
      email: updates.email ? updates.email.trim().toLowerCase() : user.email,
      name: updates.name?.trim() || user.name,
      phone: updates.phone?.trim() || user.phone,
    };
    setUser(nextUser);
    return nextUser;
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prev: string[]) =>
      prev.includes(productId)
        ? prev.filter((id: string) => id !== productId)
        : [...prev, productId]
    );
  };

  const updateProductStock = (productId: string, stock: number) => {
    setProducts((prev: Product[]) =>
      prev.map((product: Product) =>
        product.id === productId ? { ...product, stock: Math.max(0, stock) } : product
      )
    );
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts((prev: Product[]) =>
      prev.map((product: Product) =>
        product.id === productId ? { ...product, ...updates, id: product.id, slug: product.slug } : product
      )
    );
  };

  const updateProductDiscount = (productId: string, discountPercent: number) => {
    setProducts((prev: Product[]) =>
      prev.map((product: Product) =>
        product.id === productId
          ? { ...product, discountPercent: clamp(discountPercent, 0, 90) }
          : product
      )
    );
  };

  const createProduct = (payload: Omit<Product, "id" | "slug"> & { id?: string; slug?: string }) => {
    const baseId = payload.id ?? slugify(payload.name);
    const id = products.find((p) => p.id === baseId) ? `${baseId}-${Date.now()}` : baseId;
    const slug = payload.slug ?? slugify(payload.name);
    const product: Product = {
      ...payload,
      id,
      slug,
      tags: payload.tags ?? [],
      colors: payload.colors ?? [],
      sizes: payload.sizes ?? [],
      images: payload.images ?? [],
      highlights: payload.highlights ?? [],
      discountPercent: payload.discountPercent ?? 0,
    };
    setProducts((prev: Product[]) => [product, ...prev]);
    return product;
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev: Product[]) => prev.filter((product: Product) => product.id !== productId));
  };

  const addToCart = (item: CartItem) => {
    setCart((prev: CartItem[]) => {
      const product = products.find((p: Product) => p.id === item.productId);
      if (!product || product.stock <= 0) return prev;

      const key = getVariantKey(item);
      const next = [...prev];
      const existingIndex = next.findIndex((entry) => getVariantKey(entry) === key);
      const existing = existingIndex >= 0 ? next[existingIndex] : null;
      const currentQty = existing?.quantity ?? 0;
      const desiredQty = clamp(currentQty + item.quantity, 1, product.stock);

      if (existing) {
        next[existingIndex] = { ...existing, quantity: desiredQty };
        return next;
      }

      next.push({ ...item, quantity: clamp(item.quantity, 1, product.stock) });
      return next;
    });
  };

  const updateCartQuantity = (item: CartItem, quantity: number) => {
    setCart((prev: CartItem[]) => {
      const product = products.find((p: Product) => p.id === item.productId);
      const limit = product ? product.stock : quantity;
      return prev
        .map((entry: CartItem) => {
          if (getVariantKey(entry) !== getVariantKey(item)) return entry;
          return { ...entry, quantity: clamp(quantity, 1, limit) };
        })
        .filter((entry: CartItem) => entry.quantity > 0);
    });
  };

  const removeFromCart = (item: CartItem) => {
    setCart((prev: CartItem[]) => prev.filter((entry: CartItem) => getVariantKey(entry) !== getVariantKey(item)));
  };

  const clearCart = () => setCart([]);

  const updateOrderStatus = (orderId: string, status: OrderStatus, awbNumber?: string) => {
    setOrders((prev: Order[]) =>
      prev.map((order: Order) =>
        order.id === orderId
          ? { ...order, status, ...(awbNumber ? { awbNumber } : {}) }
          : order
      )
    );
  };

  const cartSummary = useMemo(() => {
    const subtotal = cart.reduce((sum: number, item: CartItem) => {
      const product = products.find((p: Product) => p.id === item.productId);
      if (!product) return sum;
      const { sale } = getProductPrice(product);
      return sum + sale * item.quantity;
    }, 0);
    return { subtotal, formatted: formatCurrency(subtotal) };
  }, [cart, products]);

  const createOrder = (payload: CreateOrderPayload) => {
    if (!cart.length) return null;

    const normalizedCart = cart.map((item: CartItem) => {
      const product = products.find((p: Product) => p.id === item.productId);
      if (!product) return item;
      return { ...item, quantity: clamp(item.quantity, 1, product.stock) };
    });

    const subtotal = normalizedCart.reduce((sum: number, item: CartItem) => {
      const product = products.find((p: Product) => p.id === item.productId);
      if (!product) return sum;
      const { sale } = getProductPrice(product);
      return sum + sale * item.quantity;
    }, 0);
    const shippingFee = payload.shippingFee ?? 0;
    const orderTotal = subtotal + shippingFee;

    // Generate order ID in format: SHIDS-DDMMordernumber
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const orderNumber = orders.length + 1;
    const orderId = `SHIDS-${day}${month}${String(orderNumber).padStart(5, "0")}`;

    const newOrder: Order = {
      id: orderId,
      items: normalizedCart,
      subtotal: Number(subtotal.toFixed(2)),
      shippingFee: Number(shippingFee.toFixed(2)),
      total: Number(orderTotal.toFixed(2)),
      email: payload.email,
      address: payload.address,
      status: "pending",
      createdAt: new Date().toISOString(),
      notes: payload.notes,
      paymentProof: payload.paymentProof,
      paymentVerified: false,
    };

    setOrders((prev: Order[]) => [...prev, newOrder]);
    setProducts((prev: Product[]) =>
      prev.map((product: Product) => {
        const orderedQty = normalizedCart
          .filter((item: CartItem) => item.productId === product.id)
          .reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
        if (!orderedQty) return product;
        return { ...product, stock: Math.max(0, product.stock - orderedQty) };
      })
    );
    setCart([]);
    return newOrder;
  };

  const getProductBySlug = (slug: string) => products.find((product: Product) => product.slug === slug);

  const wishlistItems = useMemo(
    () => products.filter((product: Product) => wishlist.includes(product.id)),
    [products, wishlist]
  );

  const deleteOrder = (orderId: string) => {
    setOrders((prev: Order[]) => prev.filter((order: Order) => order.id !== orderId));
  };

  const verifyPayment = (orderId: string, verified = true) => {
    setOrders((prev: Order[]) =>
      prev.map((order: Order) =>
        order.id === orderId
          ? {
              ...order,
              paymentVerified: verified,
              status: verified ? "paid" : order.status,
            }
          : order
      )
    );
  };

  const deleteCustomer = (email: string) => {
    setOrders((prev: Order[]) => prev.filter((order: Order) => order.email !== email));
  };

  const createDiscountCode = (code: string, description: string, type: "percentage" | "fixed", value: number, maxUses?: number, expiryDate?: string) => {
    const newCode: DiscountCode = {
      id: `CODE-${Date.now()}`,
      code: code.toUpperCase(),
      description,
      type,
      value,
      maxUses,
      usedCount: 0,
      expiryDate,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setDiscountCodes((prev: DiscountCode[]) => [newCode, ...prev]);
    return newCode;
  };

  const updateDiscountCode = (codeId: string, updates: Partial<DiscountCode>) => {
    setDiscountCodes((prev: DiscountCode[]) =>
      prev.map((code: DiscountCode) => (code.id === codeId ? { ...code, ...updates } : code))
    );
  };

  const deleteDiscountCode = (codeId: string) => {
    setDiscountCodes((prev: DiscountCode[]) => prev.filter((code: DiscountCode) => code.id !== codeId));
  };

  const toggleDiscountCodeActive = (codeId: string) => {
    setDiscountCodes((prev: DiscountCode[]) =>
      prev.map((code: DiscountCode) => (code.id === codeId ? { ...code, isActive: !code.isActive } : code))
    );
  };

  return {
    ready,
    products,
    orders,
    cart,
    wishlist,
    discountCodes,
    user,
    recentlyViewed,
    wishlistItems,
    cartSummary,
    signIn,
    signOut,
    updateUser,
    addRecentlyViewed,
    clearRecentlyViewed,
    toggleWishlist,
    updateProductStock,
    updateProduct,
    deleteProduct,
    updateProductDiscount,
    createProduct,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    createOrder,
    updateOrderStatus,
    deleteOrder,
    verifyPayment,
    deleteCustomer,
    createDiscountCode,
    updateDiscountCode,
    deleteDiscountCode,
    toggleDiscountCodeActive,
    getProductBySlug,
  };
}
