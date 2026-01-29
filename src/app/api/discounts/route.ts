import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { DiscountCode } from "@/app/lib/types";

const mapDiscountRow = (row: Record<string, any>): DiscountCode => ({
  id: row.id,
  code: row.code,
  description: row.description ?? undefined,
  type: row.type,
  value: row.value,
  maxUses: row.max_uses ?? undefined,
  usedCount: row.used_count ?? 0,
  expiryDate: row.expiry_date ?? undefined,
  isActive: !!row.is_active,
  createdAt: row.created_at,
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const active = searchParams.get("active");
  let query = supabaseAdmin.from("discount_codes").select("*").order("created_at", { ascending: false });
  if (active === "true") {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data: (data ?? []).map(mapDiscountRow) });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<DiscountCode>;

  const code = body.code?.trim().toUpperCase();
  const type = body.type;
  const value = Number(body.value ?? 0);

  if (!code || (type !== "percentage" && type !== "fixed") || value <= 0) {
    return NextResponse.json({ ok: false, error: "Code, type, and value are required." }, { status: 400 });
  }

  const id = body.id?.trim() || `CODE-${Date.now()}`;
  const createdAt = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("discount_codes")
    .insert({
      id,
      code,
      description: body.description?.trim() || null,
      type,
      value,
      max_uses: body.maxUses ?? null,
      used_count: body.usedCount ?? 0,
      expiry_date: body.expiryDate ?? null,
      is_active: body.isActive === false ? false : true,
      created_at: createdAt,
    })
    .select("*")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ ok: false, error: status === 409 ? "Code already exists." : error.message }, { status });
  }

  return NextResponse.json({ ok: true, data: mapDiscountRow(data) }, { status: 201 });
}
