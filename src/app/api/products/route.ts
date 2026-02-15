import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { slugify } from "@/app/lib/utils";
import type { Product, Variant } from "@/app/lib/types";
import { requireAdmin } from "@/app/lib/authContext";
import { logEvent } from "@/app/lib/observability";

export const dynamic = 'force-dynamic';

const parseStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : typeof value === "string"
      ? value
        .split(/[,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
      : [];

type ProductColor = { name: string; hex: string };

const parseColorList = (value: unknown): ProductColor[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (entry && typeof entry === "object") {
        const candidate = entry as { name?: unknown; hex?: unknown };
        const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
        const hex = typeof candidate.hex === "string" ? candidate.hex.trim() : "";
        if (name && hex) return { name, hex };
        return null;
      }

      if (typeof entry === "string") {
        const trimmed = entry.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("{")) {
          try {
            const parsed = JSON.parse(trimmed) as { name?: unknown; hex?: unknown };
            const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
            const hex = typeof parsed.hex === "string" ? parsed.hex.trim() : "";
            if (name && hex) return { name, hex };
          } catch {
            return null;
          }
        }
        return null;
      }

      return null;
    })
    .filter((entry): entry is ProductColor => entry !== null);
};

const parseJsonArray = <T>(value: unknown, fallback: T[] = []): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string" || !value.trim()) return fallback;

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
};

type VariantRow = {
  id: number;
  product_id: string;
  size: string | null;
  color: string | null;
  stock: number;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  stock: number;
  rating: number | null;
  badge: string | null;
  tags: string | null;
  colors: string | null;
  sizes: string | null;
  highlights: string | null;
  images: string | null;
  bestseller: boolean | null;
  sku: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const mapVariantRow = (row: VariantRow): Variant => ({
  id: row.id,
  productId: row.product_id,
  size: row.size ?? "",
  color: row.color ?? "",
  stock: row.stock,
});

const mapProductRow = (row: ProductRow, variants?: Variant[]): Product => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description ?? "",
  category: row.category ?? "",
  price: Number(row.price ?? 0),
  originalPrice: row.original_price ?? undefined,
  discountPercent: row.discount_percent ?? undefined,
  stock: Number(row.stock ?? 0),
  rating: row.rating ?? undefined,
  badge: row.badge ?? undefined,
  tags: parseJsonArray<string>(row.tags),
  colors: parseJsonArray<ProductColor>(row.colors),
  sizes: parseJsonArray<string>(row.sizes),
  highlights: parseJsonArray<string>(row.highlights),
  images: parseJsonArray<string>(row.images),
  variants: variants ?? [],
  bestseller: row.bestseller ?? false,
  sku: row.sku ?? undefined,
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search")?.trim();
  const category = searchParams.get("category")?.trim();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 12), 1), 100);
  const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
  const offset = (page - 1) * limit;

  let query = supabaseAdmin.from("products").select("*", { count: "exact" });
  if (search) {
    query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`);
  }
  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Fetch variants for all returned products
  const productIds = (data ?? []).map((p) => p.id);
  const { data: variantRows } = productIds.length > 0
    ? await supabaseAdmin
      .from("product_variants")
      .select("*")
      .in("product_id", productIds)
    : { data: [] };

  // Group variants by product_id
  const variantsByProduct = new Map<string, Variant[]>();
  for (const row of (variantRows ?? []) as VariantRow[]) {
    const mapped = mapVariantRow(row);
    const existing = variantsByProduct.get(mapped.productId) ?? [];
    existing.push(mapped);
    variantsByProduct.set(mapped.productId, existing);
  }

  return NextResponse.json({
    ok: true,
    data: {
      data: (data ?? []).map((row) => mapProductRow(row, variantsByProduct.get(row.id))),
      count: count ?? 0,
      page,
      limit,
    },
  });
}

export async function POST(request: NextRequest) {
  // [NEW] Security Check
  if (!await requireAdmin(request)) {
    logEvent("warn", "product_create_unauthorized", { path: request.nextUrl.pathname });
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<Product> & { slug?: string };

  const name = body.name?.trim();
  const category = body.category?.trim();
  const description = body.description?.trim() ?? "";
  const price = Number(body.price ?? 0);
  if (!name || !category || price <= 0) {
    return NextResponse.json({ ok: false, error: "Name, category, and price are required." }, { status: 400 });
  }

  const id = body.id?.trim() || slugify(name);
  const slug = body.slug?.trim() || slugify(name);
  const now = new Date().toISOString();

  // [NEW] Numeric SKU auto-generation if missing
  let sku = body.sku?.trim();
  if (!sku) {
    // Generate a random 10-digit numeric SKU (not guaranteed unique, but low collision risk)
    sku = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }

  // [NEW] Bestseller flag
  const bestseller = typeof body.bestseller === 'boolean' ? body.bestseller : false;

  const payload: Product = {
    id,
    slug,
    name,
    description,
    category,
    price,
    originalPrice: body.originalPrice ? Number(body.originalPrice) : undefined,
    discountPercent: body.discountPercent ? Number(body.discountPercent) : undefined,
    stock: typeof body.stock === "number" ? body.stock : Number(body.stock ?? 0),
    badge: body.badge?.trim() || undefined,
    rating: body.rating ? Number(body.rating) : undefined,
    tags: parseStringList(body.tags),
    colors: parseColorList(body.colors),
    sizes: parseStringList(body.sizes),
    highlights: parseStringList(body.highlights),
    images: parseStringList(body.images),
    bestseller,
    sku,
  };

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({
      id: payload.id,
      slug: payload.slug,
      name: payload.name,
      description: payload.description,
      category: payload.category,
      price: payload.price,
      original_price: payload.originalPrice ?? null,
      discount_percent: payload.discountPercent ?? null,
      stock: payload.stock ?? 0,
      rating: payload.rating ?? null,
      badge: payload.badge ?? null,
      tags: payload.tags,
      colors: payload.colors,
      sizes: payload.sizes,
      highlights: payload.highlights,
      images: payload.images,
      created_at: now,
      updated_at: now,
      bestseller,
      sku,
    })
    .select("*")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ ok: false, error: status === 409 ? "Product already exists." : error.message }, { status });
  }

  // If variants were provided in the request body, persist them to product_variants
  try {
    if (Array.isArray(body.variants) && body.variants.length > 0) {
      const rows = body.variants.map((v: unknown) => {
        const vv = v as Record<string, unknown>;
        const size = typeof vv.size === "string" && vv.size ? vv.size : null;
        const color = typeof vv.color === "string" && vv.color ? vv.color : null;
        const stock = typeof vv.stock === "number" ? vv.stock : Number(vv.stock ?? 0);
        return { product_id: data.id, size, color, stock };
      });
      await supabaseAdmin.from("product_variants").insert(rows);
    }
  } catch (err) {
    console.warn("Failed to persist variants", err);
  }

  // Fetch persisted variants to include in response
  const { data: variantRows } = await supabaseAdmin.from("product_variants").select("*").eq("product_id", data.id);
  const variantRowsTyped = (variantRows ?? []) as VariantRow[];
  const variants = variantRowsTyped.map(mapVariantRow);

  return NextResponse.json({ ok: true, data: mapProductRow(data, variants) }, { status: 201 });
}
