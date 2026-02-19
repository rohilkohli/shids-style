import HomeClient from "./HomeClient";
import { isSupabaseAdminConfigured, supabaseAdmin } from "./lib/supabaseAdmin";
import type { HeroItem } from "./components/HeroCarousel";
import type { Product } from "./lib/types";

export const revalidate = 60;

export default async function HomePage() {
  const data = isSupabaseAdminConfigured
    ? (await supabaseAdmin
      .from("hero_products")
      .select("id, position, product_id, product:products(*)")
      .order("position", { ascending: true })).data
    : [];

  const heroItems: HeroItem[] = (data ?? [])
    .filter((item) => item?.product)
    .map((item) => ({
      id: item.id,
      position: item.position,
      product: item.product as unknown as Product,
    }));

  return <HomeClient initialHeroItems={heroItems} />;
}
