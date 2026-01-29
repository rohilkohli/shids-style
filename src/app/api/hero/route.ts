import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("hero_products")
    .select("id, position, product_id, product:products(*)")
    .order("position", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { productId?: string; position?: number };
  const productId = body.productId?.trim();
  const position = Number(body.position ?? 0);

  if (!productId) {
    return NextResponse.json({ ok: false, error: "Product ID is required." }, { status: 400 });
  }

  const { data: product } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("hero_products")
    .upsert({ product_id: productId, position }, { onConflict: "product_id" })
    .select("id, position, product_id")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id")?.trim();
  const productId = searchParams.get("productId")?.trim();

  if (!id && !productId) {
    return NextResponse.json({ ok: false, error: "Hero entry id or productId is required." }, { status: 400 });
  }

  const query = supabaseAdmin.from("hero_products").delete();
  const { error } = id ? await query.eq("id", id) : await query.eq("product_id", productId!);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
