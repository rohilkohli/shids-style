import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { slugify } from "@/app/lib/utils";
import type { Product } from "@/app/lib/types";

export const revalidate = 30;

const parseList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => String(item)).filter(Boolean)
    : typeof value === "string"
      ? value
          .split(/[,;]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

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
  created_at?: string | null;
  updated_at?: string | null;
};

const mapProductRow = (row: ProductRow): Product => ({
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

  // Check the role in the 'profiles' table
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", resolvedUser.id)
    .single();

  return profile?.role === "admin";
}

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

  return NextResponse.json({
    ok: true,
    data: {
      data: (data ?? []).map(mapProductRow),
      count: count ?? 0,
      page,
      limit,
    },
  });
}

export async function POST(request: NextRequest) {
  // [NEW] Security Check
  if (!await checkAdmin(request)) {
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
    tags: parseList(body.tags),
    colors: parseList(body.colors),
    sizes: parseList(body.sizes),
    highlights: parseList(body.highlights),
    images: parseList(body.images),
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
    })
    .select("*")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ ok: false, error: status === 409 ? "Product already exists." : error.message }, { status });
  }

  return NextResponse.json({ ok: true, data: mapProductRow(data) }, { status: 201 });
}