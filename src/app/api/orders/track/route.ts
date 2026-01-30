import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { Order, OrderStatus } from "@/app/lib/types";

type OrderItemRow = {
  product_id: string;
  quantity: number;
  color: string | null;
  size: string | null;
};

type OrderRow = {
  id: string;
  order_items?: OrderItemRow[];
  subtotal: number | null;
  shipping_fee: number | null;
  total: number;
  email: string;
  address: string;
  status: OrderStatus;
  created_at: string;
  notes: string | null;
  payment_proof: string | null;
  payment_verified: boolean | null;
  awb_number: string | null;
};

const mapOrderRow = (row: OrderRow): Order => ({
  id: row.id,
  items: (row.order_items ?? []).map((item: OrderItemRow) => ({
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
