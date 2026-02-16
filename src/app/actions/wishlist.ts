"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

export async function toggleWishlistAction(productId: string): Promise<{ added: boolean; success: boolean }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !productId.trim()) {
    return { added: false, success: false };
  }

  const normalizedProductId = productId.trim();

  const { data: existing } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("user_id", user.id)
    .eq("product_id", normalizedProductId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", normalizedProductId);

    if (error) {
      return { added: true, success: false };
    }

    revalidatePath("/shop");
    return { added: false, success: true };
  }

  const { error } = await supabase
    .from("wishlists")
    .insert({ user_id: user.id, product_id: normalizedProductId });

  if (error) {
    return { added: false, success: false };
  }

  revalidatePath("/shop");
  return { added: true, success: true };
}

export async function getWishlistAction(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("user_id", user.id);

  if (error) return [];

  return (data ?? []).map((row) => row.product_id as string);
}
