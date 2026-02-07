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
  discount_code: string | null;
  discount_amount: number | null;
  total: number;
  email: string;
  address: string;
  status: OrderStatus;
  created_at: string;
  notes: string | null;
  payment_verified: boolean | null;
  awb_number: string | null;
  courier_name: string | null;
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
  discountCode: row.discount_code ?? undefined,
  discountAmount: row.discount_amount ?? undefined,
  total: Number(row.total ?? 0),
  email: row.email,
  address: row.address,
  status: row.status as OrderStatus,
  createdAt: row.created_at,
  notes: row.notes ?? undefined,
  paymentVerified: !!row.payment_verified,
  awbNumber: row.awb_number ?? undefined,
  courierName: row.courier_name ?? undefined,
});

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { orderId?: string; email?: string };
  const orderId = decodeURIComponent(body.orderId ?? "").trim().toLowerCase();
  const email = decodeURIComponent(body.email ?? "").trim().toLowerCase();

  if (process.env.NODE_ENV !== "production") {
    let host = "";
    try {
      host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host;
    } catch {
      host = "";
    }
    console.info("[track] supabase", { host });
  }

  console.info("[track] lookup", { orderId, email });

  if (!orderId || !email) {
    return NextResponse.json({ ok: false, error: "Order ID and email are required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .ilike("id", `%${orderId}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const normalizedEmail = data?.email?.trim().toLowerCase() ?? "";

  if (error) {
    console.warn("[track] lookup failed", { orderId, email, error: error.message });
    const status = process.env.NODE_ENV === "production" ? 404 : 500;
    const message = process.env.NODE_ENV === "production"
      ? "Order not found."
      : `Track lookup failed: ${error.message}`;
    return NextResponse.json({ ok: false, error: message }, { status });
  }

  if (!data || normalizedEmail !== email) {
    console.warn("[track] not found", { orderId, email });
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: mapOrderRow(data) });
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "Use POST with { orderId, email } to track an order.",
    },
    { status: 405 }
  );
}
