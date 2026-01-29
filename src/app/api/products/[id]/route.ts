import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { slugify } from "@/app/lib/utils";
import type { Product } from "@/app/lib/types";

const parseList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => String(item)).filter(Boolean)
    : typeof value === "string"
      ? value
          .split(/[,;]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

const mapProductRow = (row: Record<string, any>): Product => ({
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
});

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
  return NextResponse.json({ ok: true, data: mapProductRow(data) });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      badge: body.badge?.trim() ?? current.badge,
      tags: body.tags ? parseList(body.tags) : current.tags,
      colors: body.colors ? parseList(body.colors) : current.colors,
      sizes: body.sizes ? parseList(body.sizes) : current.sizes,
      highlights: body.highlights ? parseList(body.highlights) : current.highlights,
      images: body.images ? parseList(body.images) : current.images,
      updated_at: updatedAt,
    })
    .eq("id", current.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: mapProductRow(data) });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const rawId = resolved?.id ?? "";
  const lookupSource = rawId || _.nextUrl.pathname.split("/").pop() || "";
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

  const { error } = await supabaseAdmin.from("products").delete().eq("id", row.id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
