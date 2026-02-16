"use client";

import { getWishlistAction, toggleWishlistAction } from "@/app/actions/wishlist";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

export function useWishlist() {
  const [wishlistSet, setWishlistSet] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const ids = await getWishlistAction();
      if (cancelled) return;
      setWishlistSet(new Set(ids));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback((productId: string) => {
    if (!productId.trim()) return;

    const normalizedProductId = productId.trim();
    let wasWishlisted = false;

    setWishlistSet((prev) => {
      const next = new Set(prev);
      wasWishlisted = next.has(normalizedProductId);
      if (wasWishlisted) {
        next.delete(normalizedProductId);
      } else {
        next.add(normalizedProductId);
      }
      return next;
    });

    startTransition(() => {
      void (async () => {
        const result = await toggleWishlistAction(normalizedProductId);
        if (!result.success) {
          setWishlistSet((prev) => {
            const next = new Set(prev);
            if (wasWishlisted) {
              next.add(normalizedProductId);
            } else {
              next.delete(normalizedProductId);
            }
            return next;
          });
        }
      })();
    });
  }, []);

  return useMemo(() => ({ wishlistSet, toggle }), [toggle, wishlistSet]);
}
