"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultOrders, defaultProducts } from "./data";
import { CartItem, Order, OrderStatus, Product, DiscountCode, User } from "./types";
import { formatCurrency, slugify } from "./utils";
import { supabase } from "./supabaseClient";

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

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

type PersistedState = {
  products: Product[];
  orders: Order[];
  cart: CartItem[];
  wishlist: string[];
  discountCodes: DiscountCode[];
  user?: User | null;
  recentlyViewed: string[];
};

export function useCommerceStore() {
  const instanceIdRef = useRef<string | null>(null);
  const suppressBroadcastRef = useRef(false);
  const storedState = useMemo<Partial<PersistedState> | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Partial<PersistedState>;
    } catch (error) {
      console.warn("Failed to read stored state", error);
      return null;
    }
  }, []);

  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<Product[]>(
    storedState?.products?.length ? storedState.products : defaultProducts
  );
  const [orders, setOrders] = useState<Order[]>(
    storedState?.orders?.length ? storedState.orders : defaultOrders
  );
  const [cart, setCart] = useState<CartItem[]>(storedState?.cart ?? []);
  const [wishlist, setWishlist] = useState<string[]>(storedState?.wishlist ?? []);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>(storedState?.discountCodes ?? []);
  const [user, setUser] = useState<User | null>(storedState?.user ?? null);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(storedState?.recentlyViewed ?? []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  useEffect(() => {
    let active = true;
    const ensureSession = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error && active) {
          if (error.message.includes("Invalid Refresh Token")) {
            await supabase.auth.signOut({ scope: "local" });
            if (typeof window !== "undefined") {
              Object.keys(window.localStorage)
                .filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))
                .forEach((key) => window.localStorage.removeItem(key));
            }
            setUser(null);
          }
        }
      } catch {
        if (active) {
          setUser(null);
        }
      }
    };
    if (ready) {
      ensureSession();
    }
    return () => {
      active = false;
    };
  }, [ready]);

  useEffect(() => {
    if (!instanceIdRef.current) {
      instanceIdRef.current = `inst-${Date.now()}-${Math.random()}`;
    }
  }, []);

  const apiRequest = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const data = (await response.json().catch(() => ({ ok: false, error: "Invalid server response." }))) as ApiResponse<T>;
    if (!response.ok || !data.ok) {
      throw new Error(data.ok ? "Request failed." : data.error);
    }
    return data.data;
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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!ready) return;
    const productIds = new Set(products.map((product) => product.id));
    setCart((prev) => prev.filter((item) => productIds.has(item.productId)));
    setWishlist((prev) => prev.filter((id) => productIds.has(id)));
  }, [products, ready]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const mapSupabaseUser = (sbUser: {
    id: string;
    email?: string | null;
    user_metadata?: { name?: string; phone?: string } | null;
    app_metadata?: Record<string, unknown> | null;
  }): User => {
    const roleValue = sbUser.app_metadata && typeof sbUser.app_metadata["role"] === "string"
      ? (sbUser.app_metadata["role"] as "admin" | "customer")
      : undefined;

    return {
      id: sbUser.id,
      email: sbUser.email ?? "",
      name: sbUser.user_metadata?.name || "SHIDS Member",
      phone: sbUser.user_metadata?.phone || undefined,
      role: roleValue,
    };
  };

  const fetchProfile = useCallback(
    async (email: string) => {
      try {
        return await apiRequest<User>(`/api/users/${encodeURIComponent(email)}`);
      } catch (error) {
        return null;
      }
    },
    [apiRequest]
  );

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const syncFromApi = async () => {
      try {
        const [nextProducts, nextOrders, nextDiscounts] = await Promise.all([
          apiRequest<Product[]>("/api/products"),
          apiRequest<Order[]>("/api/orders"),
          apiRequest<DiscountCode[]>("/api/discounts"),
        ]);
        if (cancelled) return;
        setProducts(nextProducts);
        setOrders(nextOrders);
        setDiscountCodes(nextDiscounts);
      } catch (error) {
        console.warn("Backend sync failed", error);
      }
    };
    syncFromApi();
    return () => {
      cancelled = true;
    };
  }, [apiRequest, ready]);

  useEffect(() => {
    if (!ready) return;
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user?.email) {
        const profile = await fetchProfile(data.session.user.email);
        setUser(profile ?? mapSupabaseUser(data.session.user));
      }
    });
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.email) {
        const profile = await fetchProfile(session.user.email);
        setUser(profile ?? mapSupabaseUser(session.user));
      } else {
        setUser(null);
      }
    });
    return () => {
      subscription?.subscription?.unsubscribe();
    };
  }, [ready, fetchProfile]);

  const addRecentlyViewed = useCallback((productId: string) => {
    setRecentlyViewed((prev: string[]) => {
      const next = [productId, ...prev.filter((id) => id !== productId)];
      return next.slice(0, 12);
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => setRecentlyViewed([]), []);

  const loginUser = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      throw new Error(error?.message || "Invalid credentials.");
    }

    const profile = await fetchProfile(email);
    const nextUser = profile ?? mapSupabaseUser(data.user);
    setUser(nextUser);
    return nextUser;
  };

  const registerUser = async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error || !data.user) {
      throw new Error(error?.message || "Unable to register.");
    }
    await supabase.auth.signOut();
    setUser(null);
    const profile = await fetchProfile(email);
    return profile ?? mapSupabaseUser(data.user);
  };

  const signOut = () => {
    supabase.auth.signOut().catch(() => undefined);
    setUser(null);
  };

  const updateUser = async (updates: Partial<Omit<User, "id">>) => {
    if (!user) return null;
    const nextUser = await apiRequest<User>(`/api/users/${encodeURIComponent(user.email)}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
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

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    const updated = await apiRequest<Product>(`/api/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    setProducts((prev: Product[]) =>
      prev.map((product: Product) => (product.id === updated.id ? updated : product))
    );
    return updated;
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

  const createProduct = async (payload: Omit<Product, "id" | "slug"> & { id?: string; slug?: string }) => {
    const product = await apiRequest<Product>("/api/products", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        id: payload.id ?? slugify(payload.name),
        slug: payload.slug ?? slugify(payload.name),
      }),
    });
    setProducts((prev: Product[]) => [product, ...prev]);
    return product;
  };

  const deleteProduct = async (productId: string) => {
    await apiRequest<{ ok: true }>(`/api/products/${productId}`, { method: "DELETE" });
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

  const updateOrderStatus = async (orderId: string, status: OrderStatus, awbNumber?: string) => {
    const updated = await apiRequest<Order>(`/api/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status, awbNumber: awbNumber ?? null }),
    });
    setOrders((prev: Order[]) => prev.map((order: Order) => (order.id === orderId ? updated : order)));
    return updated;
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

  const createOrder = async (payload: CreateOrderPayload) => {
    if (!cart.length) return null;

    const normalizedCart = cart.map((item: CartItem) => {
      const product = products.find((p: Product) => p.id === item.productId);
      if (!product) return item;
      return { ...item, quantity: clamp(item.quantity, 1, product.stock) };
    });

    const created = await apiRequest<Order>("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        email: payload.email,
        address: payload.address,
        notes: payload.notes,
        paymentProof: payload.paymentProof,
        shippingFee: payload.shippingFee,
        items: normalizedCart,
      }),
    });

    setOrders((prev: Order[]) => [...prev, created]);
    setCart([]);
    try {
      const refreshed = await apiRequest<Product[]>("/api/products");
      setProducts(refreshed);
    } catch (error) {
      console.warn("Failed to refresh products after order", error);
    }
    return created;
  };

  const getProductBySlug = (slug: string) => products.find((product: Product) => product.slug === slug);

  const wishlistItems = useMemo(
    () => products.filter((product: Product) => wishlist.includes(product.id)),
    [products, wishlist]
  );

  const deleteOrder = async (orderId: string) => {
    await apiRequest<{ ok: true }>(`/api/orders/${orderId}`, { method: "DELETE" });
    setOrders((prev: Order[]) => prev.filter((order: Order) => order.id !== orderId));
  };

  const verifyPayment = async (orderId: string, verified = true) => {
    const updated = await apiRequest<Order>(`/api/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ paymentVerified: verified }),
    });
    setOrders((prev: Order[]) => prev.map((order: Order) => (order.id === orderId ? updated : order)));
    return updated;
  };

  const deleteCustomer = async (email: string) => {
    await apiRequest<{ ok: true }>(`/api/users/${encodeURIComponent(email)}`, { method: "DELETE" });
    const toDelete = orders.filter((order: Order) => order.email === email);
    await Promise.all(toDelete.map((order) => deleteOrder(order.id)));
  };

  const createDiscountCode = async (
    code: string,
    description: string,
    type: "percentage" | "fixed",
    value: number,
    maxUses?: number,
    expiryDate?: string
  ) => {
    const created = await apiRequest<DiscountCode>("/api/discounts", {
      method: "POST",
      body: JSON.stringify({
        code,
        description,
        type,
        value,
        maxUses,
        expiryDate,
      }),
    });
    setDiscountCodes((prev: DiscountCode[]) => [created, ...prev]);
    return created;
  };

  const updateDiscountCode = async (codeId: string, updates: Partial<DiscountCode>) => {
    const updated = await apiRequest<DiscountCode>(`/api/discounts/${codeId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    setDiscountCodes((prev: DiscountCode[]) =>
      prev.map((code: DiscountCode) => (code.id === codeId ? updated : code))
    );
    return updated;
  };

  const deleteDiscountCode = async (codeId: string) => {
    await apiRequest<{ ok: true }>(`/api/discounts/${codeId}`, { method: "DELETE" });
    setDiscountCodes((prev: DiscountCode[]) => prev.filter((code: DiscountCode) => code.id !== codeId));
  };

  const toggleDiscountCodeActive = async (codeId: string) => {
    const current = discountCodes.find((code) => code.id === codeId);
    if (!current) return null;
    return updateDiscountCode(codeId, { isActive: !current.isActive });
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
    loginUser,
    registerUser,
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
