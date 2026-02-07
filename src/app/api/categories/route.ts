import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { slugify } from "@/app/lib/utils";

const mapCategory = (row: {
  id: number;
  name: string;
  slug: string;
  created_at?: string | null;
  featured_product_id?: string | null;
}) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  featuredProductId: row.featured_product_id ?? undefined,
  createdAt: row.created_at ?? undefined,
});

async function getUser(request: NextRequest) {
  try {
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

    if (!resolvedUser) return null;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", resolvedUser.id)
      .single();

    return {
      id: resolvedUser.id,
      role: profile?.role ?? "customer",
    };
  } catch (error) {
    console.warn("Failed to resolve user", error);
    return null;
  }
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, name, slug, featured_product_id, created_at")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: (data ?? []).map(mapCategory) });
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "Category name is required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("categories")
    .insert({ name, slug: slugify(name) })
    .select("id, name, slug, featured_product_id, created_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: mapCategory(data) }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await getUser(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "Category id is required." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("categories")
    .delete()
    .eq("id", Number(id));

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const user = await getUser(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { id?: number; featuredProductId?: string | null };
  if (!body.id) {
    return NextResponse.json({ ok: false, error: "Category id is required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("categories")
    .update({ featured_product_id: body.featuredProductId ?? null })
    .eq("id", body.id)
    .select("id, name, slug, featured_product_id, created_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: mapCategory(data) });
}
