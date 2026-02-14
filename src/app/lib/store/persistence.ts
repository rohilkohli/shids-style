import type { CartItem, DiscountCode, Order, Product, User } from "@/app/lib/types";

export const STORAGE_KEY = "shids-style/state/v2";

export type PersistedState = {
  products: Product[];
  orders: Order[];
  cart: CartItem[];
  wishlist: string[];
  discountCodes: DiscountCode[];
  user?: User | null;
  recentlyViewed: string[];
};

export const loadPersistedState = (): Partial<PersistedState> | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<PersistedState>;
  } catch {
    return null;
  }
};

export const persistState = (state: PersistedState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
