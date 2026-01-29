import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { Order, OrderStatus } from "@/app/lib/types";

const mapOrderRow = (row: Record<string, any>): Order => ({
  id: row.id,
  items: (row.order_items ?? []).map((item: any) => ({
    productId: item.product_id,
    quantity: item.quantity,
    color: item.color ?? undefined,
    size: item.size ?? undefined,
  })),
  subtotal: row.subtotal ?? undefined,
  shippingFee: row.shipping_fee ?? undefined,
  total: Number(row.total ?? 0),
  email: row.email,
  address: row.address,
  status: row.status as OrderStatus,
  createdAt: row.created_at,
  notes: row.notes ?? undefined,
  paymentProof: row.payment_proof ?? undefined,
  paymentVerified: !!row.payment_verified,
  awbNumber: row.awb_number ?? undefined,
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  const { id } = await params;
  const rawId = id ?? "";
  const lookupSource = rawId || _.nextUrl.pathname.split("/").pop() || "";
  const lookup = decodeURIComponent(lookupSource).replace(/\s/g, "+").trim();

  const { data: row } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .or(`id.eq.${lookup},id.ilike.%${lookup}%`)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: mapOrderRow(row) });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  const { id } = await params;
  const rawId = id ?? "";
  const lookupSource = rawId || request.nextUrl.pathname.split("/").pop() || "";
  const lookup = decodeURIComponent(lookupSource).replace(/\s/g, "+").trim();

  const { data: row } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .or(`id.eq.${lookup},id.ilike.%${lookup}%`)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  const body = (await request.json()) as {
    status?: OrderStatus;
    paymentVerified?: boolean;
    paymentProof?: string | null;
    awbNumber?: string | null;
    notes?: string | null;
  };

  const { data: updated, error } = await supabaseAdmin
    .from("orders")
    .update({
      status: body.status ?? row.status,
      payment_verified: body.paymentVerified !== undefined ? body.paymentVerified : row.payment_verified,
      payment_proof: body.paymentProof !== undefined ? body.paymentProof : row.payment_proof,
      awb_number: body.awbNumber !== undefined ? body.awbNumber : row.awb_number,
      notes: body.notes !== undefined ? body.notes : row.notes,
    })
    .eq("id", row.id)
    .select("*, order_items(*)")
    .single();

  if (error || !updated) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: mapOrderRow(updated) });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  const { id } = await params;
  const rawId = id ?? "";
  const lookupSource = rawId || _.nextUrl.pathname.split("/").pop() || "";
  const lookup = decodeURIComponent(lookupSource).replace(/\s/g, "+").trim();
  const { data: row } = await supabaseAdmin
    .from("orders")
    .select("id")
    .or(`id.eq.${lookup},id.ilike.%${lookup}%`)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  const { error: itemsError } = await supabaseAdmin.from("order_items").delete().eq("order_id", row.id);
  if (itemsError) {
    return NextResponse.json({ ok: false, error: itemsError.message }, { status: 500 });
  }

  const { error: orderError } = await supabaseAdmin.from("orders").delete().eq("id", row.id);
  if (orderError) {
    return NextResponse.json({ ok: false, error: orderError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
