import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { defaultProducts } from "@/app/lib/data";
import { isSupabaseAdminConfigured, supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { Product } from "@/app/lib/types";
import { generateProductSchema } from "@/app/lib/seo";
import ProductDetailClient from "./ProductDetailClient";

export const dynamicParams = true;

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  tags: string[] | string | null;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  stock: number;
  badge: string | null;
  rating: number | null;
  colors: Array<string | { name: string; hex: string }> | string | null;
  sizes: string[] | string | null;
  description: string;
  highlights: string[] | string | null;
  images: string[] | string | null;
  sku: string | null;
};

const parseJsonArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const mapRowToProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  category: row.category,
  tags: parseJsonArray<string>(row.tags),
  price: Number(row.price ?? 0),
  originalPrice: row.original_price ?? undefined,
  discountPercent: row.discount_percent ?? undefined,
  stock: Number(row.stock ?? 0),
  badge: row.badge ?? undefined,
  rating: row.rating ?? undefined,
  colors: parseJsonArray<string | { name: string; hex: string }>(row.colors),
  sizes: parseJsonArray<string>(row.sizes),
  description: row.description ?? "",
  highlights: parseJsonArray<string>(row.highlights),
  images: parseJsonArray<string>(row.images),
  sku: row.sku ?? undefined,
});

async function getProductBySlug(slug: string): Promise<Product | null> {
  const fallback = defaultProducts.find((product) => product.slug === slug) ?? null;

  if (!isSupabaseAdminConfigured) return fallback;

  const { data } = await supabaseAdmin
    .from("products")
    .select("id,name,slug,category,tags,price,original_price,discount_percent,stock,badge,rating,colors,sizes,description,highlights,images,sku")
    .eq("slug", slug)
    .maybeSingle<ProductRow>();

  if (!data) return fallback;
  return mapRowToProduct(data);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found | SHIDS STYLE",
    };
  }

  const image = product.images?.[0];

  return {
    title: `${product.name} | SHIDS STYLE`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: image ? [{ url: image, alt: product.name }] : [],
    },
  };
}

export function generateStaticParams() {
  return defaultProducts.map((product) => ({ slug: product.slug }));
}

export default async function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const schema = generateProductSchema(product);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <ProductDetailClient key={slug} slug={slug} />
    </>
  );
}
