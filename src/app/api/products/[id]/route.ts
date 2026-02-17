import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { slugify } from "@/app/lib/utils";
import type { Product, Variant } from "@/app/lib/types";

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
  tags: Array.isArray(row.tags) ? row.tags : row.tags ? JSON.parse(row.tags) : [],
  colors: Array.isArray(row.colors) ? row.colors : row.colors ? JSON.parse(row.colors) : [],
  sizes: Array.isArray(row.sizes) ? row.sizes : row.sizes ? JSON.parse(row.sizes) : [],
  highlights: Array.isArray(row.highlights)
    ? row.highlights
    : row.highlights
      ? JSON.parse(row.highlights)
      : [],
  images: Array.isArray(row.images) ? row.images : row.images ? JSON.parse(row.images) : [],
  variants: variants ?? [],
  bestseller: row.bestseller ?? false,
  sku: row.sku ?? undefined,
});

// [NEW] Helper to check if user is admin
async function checkAdmin(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  let resolvedUser = user;

  if (!resolvedUser) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseAdmin.auth.getUser(token);
      resolvedUser = data.user ?? null;
    }
  }

  if (!resolvedUser) return false;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", resolvedUser.id)
    .single();

  return profile?.role === "admin";
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const rawId = resolved?.id ?? "";
  const lookupSource = rawId || _.nextUrl.pathname.split("/").pop() || "";
  const lookup = decodeURIComponent(lookupSource).replace(/\s/g, "+").trim();

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .or(`id.eq.${lookup},slug.eq.${lookup}`)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
  }

  // Fetch variants for this product
  const { data: variantRows } = await supabaseAdmin
    .from("product_variants")
    .select("*")
    .eq("product_id", data.id);

  const variants = (variantRows ?? []).map((row: VariantRow) => mapVariantRow(row));

  return NextResponse.json({ ok: true, data: mapProductRow(data, variants) });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // [NEW] Security Check
  if (!await checkAdmin(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<Product>;
  const resolved = await params;
  const rawId = resolved?.id ?? "";
  const lookupSource = rawId || request.nextUrl.pathname.split("/").pop() || "";
  const lookup = decodeURIComponent(lookupSource).replace(/\s/g, "+").trim();

  const { data: current } = await supabaseAdmin
    .from("products")
    .select("*")
    .or(`id.eq.${lookup},slug.eq.${lookup}`)
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
  }

  const name = body.name?.trim() ?? current.name;
  const slug = body.slug?.trim() ?? slugify(name);
  const updatedAt = new Date().toISOString();
  const hasBadgeField = Object.prototype.hasOwnProperty.call(body, "badge");
  const nextBadge = hasBadgeField
    ? (typeof body.badge === "string" ? body.badge.trim() : "")
    : current.badge;

  const { data, error } = await supabaseAdmin
    .from("products")
    .update({
      slug,
      name,
      description: body.description?.trim() ?? current.description,
      category: body.category?.trim() ?? current.category,
      price: typeof body.price === "number" ? body.price : Number(body.price ?? current.price),
      original_price:
        body.originalPrice !== undefined
          ? body.originalPrice
          : body.originalPrice === null
            ? null
            : current.original_price,
      discount_percent:
        body.discountPercent !== undefined
          ? body.discountPercent
          : body.discountPercent === null
            ? null
            : current.discount_percent,
      stock: typeof body.stock === "number" ? body.stock : Number(body.stock ?? current.stock),
      rating: body.rating !== undefined ? body.rating : current.rating,
      badge: hasBadgeField ? (nextBadge ? nextBadge : null) : current.badge,
      tags: body.tags ? parseStringList(body.tags) : current.tags,
      colors: body.colors ? parseColorList(body.colors) : current.colors,
      sizes: body.sizes ? parseStringList(body.sizes) : current.sizes,
      highlights: body.highlights ? parseStringList(body.highlights) : current.highlights,
      images: body.images ? parseStringList(body.images) : current.images,
      bestseller: typeof body.bestseller === 'boolean' ? body.bestseller : current.bestseller ?? false,
      sku: body.sku?.trim() ?? current.sku,
      updated_at: updatedAt,
    })
    .eq("id", current.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // If variants provided, replace existing variants for this product
  try {
    if (Array.isArray(body.variants)) {
      // delete existing
      await supabaseAdmin.from("product_variants").delete().eq("product_id", current.id);

      if (body.variants.length > 0) {
        const rows = body.variants.map((v: unknown) => {
          const vv = v as Record<string, unknown>;
          const size = typeof vv.size === "string" && vv.size ? vv.size : null;
          const color = typeof vv.color === "string" && vv.color ? vv.color : null;
          const stock = typeof vv.stock === "number" ? vv.stock : Number(vv.stock ?? 0);
          return { product_id: current.id, size, color, stock };
        });
        await supabaseAdmin.from("product_variants").insert(rows);
      }
    }
  } catch (err) {
    console.warn("Failed to upsert variants", err);
  }

  const { data: variantRows } = await supabaseAdmin.from("product_variants").select("*").eq("product_id", current.id);
  const variantRowsTyped = (variantRows ?? []) as VariantRow[];
  const variants = variantRowsTyped.map(mapVariantRow);

  return NextResponse.json({ ok: true, data: mapProductRow(data, variants) });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // [NEW] Security Check
  if (!await checkAdmin(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolved = await params;
  const rawId = resolved?.id ?? "";
  const lookupSource = rawId || request.nextUrl.pathname.split("/").pop() || "";
  const lookup = decodeURIComponent(lookupSource).replace(/\s/g, "+").trim();

  const { data: row } = await supabaseAdmin
    .from("products")
    .select("id")
    .or(`id.eq.${lookup},slug.eq.${lookup}`)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
  }

  const { data: linked } = await supabaseAdmin
    .from("order_items")
    .select("id")
    .eq("product_id", row.id)
    .limit(1);

  if (linked && linked.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Cannot delete product linked to existing orders." },
      { status: 409 }
    );
  }
  // Remove any hero section references first to satisfy FK constraints
  const { error: heroError } = await supabaseAdmin
    .from("hero_products")
    .delete()
    .eq("product_id", row.id);

  if (heroError) {
    return NextResponse.json({ ok: false, error: heroError.message }, { status: 500 });
  }

  const { error } = await supabaseAdmin.from("products").delete().eq("id", row.id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}