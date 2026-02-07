import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import type { Order, OrderStatus } from "@/app/lib/types";
import { Resend } from "resend";
import OrderStatusUpdate from "@/app/components/emails/OrderStatusUpdate";

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
      .select("role, email")
      .eq("id", resolvedUser.id)
      .single();

    return {
      id: resolvedUser.id,
      email: resolvedUser.email,
      role: profile?.role ?? "customer",
    };
  } catch (error) {
    console.error("Failed to resolve user", error);
    return null;
  }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const rawId = resolved?.id ?? "";
  const lookupSource = rawId || _.nextUrl.pathname.split("/").pop() || "";
  const lookup = decodeURIComponent(lookupSource).replace(/\s/g, "+").trim();

  const user = await getUser(_);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: row } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .or(`id.eq.${lookup},id.ilike.%${lookup}%`)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  if (user.role !== "admin" && row.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: mapOrderRow(row) });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolved = await params;
  const rawId = resolved?.id ?? "";
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
    awbNumber?: string | null;
    courierName?: string | null;
    notes?: string | null;
  };

  const nextStatus = body.status
    ?? (body.paymentVerified ? (row.status === "pending" || row.status === "processing" ? "paid" : row.status) : row.status);
  const nextPaymentVerified = body.paymentVerified !== undefined
    ? body.paymentVerified
    : (nextStatus === "paid" ? true : row.payment_verified ?? false);

  const { data: updated, error } = await supabaseAdmin
    .from("orders")
    .update({
      status: nextStatus,
      payment_verified: nextPaymentVerified,
      awb_number: body.awbNumber !== undefined ? body.awbNumber : row.awb_number,
      courier_name: body.courierName !== undefined ? body.courierName : row.courier_name,
      notes: body.notes !== undefined ? body.notes : row.notes,
    })
    .eq("id", row.id)
    .select("*, order_items(*)")
    .single();

  if (error || !updated) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Update failed." }, { status: 500 });
  }

  const mapped = mapOrderRow(updated);

  const statusChanged = row.status !== updated.status;
  const paymentChanged = !!row.payment_verified !== !!updated.payment_verified;
  const shouldNotifyStatus = statusChanged && ["processing", "packed", "fulfilled", "shipped"].includes(updated.status);
  const shouldNotifyPayment = paymentChanged && updated.payment_verified;

  if (shouldNotifyStatus || shouldNotifyPayment) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY ?? "");
      const statusLabel = updated.status.replace(/_/g, " ");
      await resend.emails.send({
        from: "SHIDS STYLE <wecare@shidstyle.com>",
        to: [updated.email],
        subject: shouldNotifyPayment
          ? `Payment verified for ${updated.id}`
          : `Order update: ${updated.id} is ${statusLabel}`,
        react: OrderStatusUpdate({
          orderId: updated.id,
          status: updated.status,
          paymentVerified: !!updated.payment_verified,
          awbNumber: updated.awb_number ?? undefined,
          courierName: updated.courier_name ?? undefined,
        }),
      });
    } catch (sendError) {
      console.warn("Failed to send order update email", sendError);
    }
  }

  return NextResponse.json({ ok: true, data: mapped });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(_);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolved = await params;
  const rawId = resolved?.id ?? "";
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
