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

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { orderId?: string; email?: string };
  const orderId = body.orderId?.trim();
  const email = body.email?.trim().toLowerCase();

  if (!orderId || !email) {
    return NextResponse.json({ ok: false, error: "Order ID and email are required." }, { status: 400 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .ilike("email", email)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: mapOrderRow(data) });
}
