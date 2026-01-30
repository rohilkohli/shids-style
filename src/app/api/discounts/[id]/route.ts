import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { DiscountCode } from "@/app/lib/types";

type DiscountRow = {
  id: string;
  code: string;
  description: string | null;
  type: "percentage" | "fixed";
  value: number;
  max_uses: number | null;
  used_count: number | null;
  expiry_date: string | null;
  is_active: boolean | null;
  created_at: string;
};

const mapDiscountRow = (row: DiscountRow): DiscountCode => ({
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const rawId = resolved?.id ?? "";
  const lookupSource = rawId || request.nextUrl.pathname.split("/").pop() || "";
  const lookup = decodeURIComponent(lookupSource).replace(/\s/g, "+").trim();
  let { data: row } = await supabaseAdmin
    .from("discount_codes")
    .select("*")
    .or(`id.eq.${lookup},code.eq.${lookup}`)
    .maybeSingle();

  if (!row) {
    const { data: fallback } = await supabaseAdmin
      .from("discount_codes")
      .select("*")
      .or(`id.ilike.%${lookup}%,code.ilike.%${lookup}%`)
      .maybeSingle();
    row = fallback ?? null;
  }

  if (!row) {
    return NextResponse.json({ ok: false, error: "Discount code not found." }, { status: 404 });
  }

  const body = (await request.json()) as Partial<DiscountCode>;
  const code = body.code?.trim().toUpperCase() ?? row.code;

  if (code !== row.code) {
    const { data: exists } = await supabaseAdmin.from("discount_codes").select("id").eq("code", code).maybeSingle();
    if (exists) {
      return NextResponse.json({ ok: false, error: "Code already exists." }, { status: 409 });
    }
  }

  const { data: updated, error } = await supabaseAdmin
    .from("discount_codes")
    .update({
      code,
      description: body.description !== undefined ? body.description?.trim() || null : row.description,
      type: body.type ?? row.type,
      value: body.value !== undefined ? Number(body.value) : row.value,
      max_uses: body.maxUses !== undefined ? body.maxUses : row.max_uses,
      used_count: body.usedCount !== undefined ? body.usedCount : row.used_count,
      expiry_date: body.expiryDate !== undefined ? body.expiryDate : row.expiry_date,
      is_active: body.isActive !== undefined ? body.isActive : row.is_active,
    })
    .eq("id", row.id)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: mapDiscountRow(updated) });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const rawId = resolved?.id ?? "";
  const lookupSource = rawId || _.nextUrl.pathname.split("/").pop() || "";
  const lookup = decodeURIComponent(lookupSource).replace(/\s/g, "+").trim();
  let { data: row } = await supabaseAdmin
    .from("discount_codes")
    .select("id")
    .or(`id.eq.${lookup},code.eq.${lookup}`)
    .maybeSingle();

  if (!row) {
    const { data: fallback } = await supabaseAdmin
      .from("discount_codes")
      .select("id")
      .or(`id.ilike.%${lookup}%,code.ilike.%${lookup}%`)
      .maybeSingle();
    row = fallback ?? null;
  }

  if (!row) {
    return NextResponse.json({ ok: false, error: "Discount code not found." }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("discount_codes").delete().eq("id", row.id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
