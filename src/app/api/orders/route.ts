import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { CartItem, Order, OrderStatus } from "@/app/lib/types";
import crypto from "crypto";

const makeOrderId = () => `ORD-${crypto.randomUUID().split("-")[0].toUpperCase()}`;

const computeSalePrice = (price: number, discountPercent?: number | null) =>
  discountPercent ? Number((price * (1 - discountPercent / 100)).toFixed(2)) : price;

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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status")?.trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  let query = supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: (data ?? []).map(mapOrderRow) });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    email: string;
    address: string;
    notes?: string;
    items: CartItem[];
    subtotal?: number;
    shippingFee?: number;
    total?: number;
    paymentProof?: string;
  };

  const email = body.email?.trim();
  const address = body.address?.trim();
  const items = Array.isArray(body.items) ? body.items.filter((item) => item?.productId && item?.quantity) : [];

  if (!email || !address || items.length === 0) {
    return NextResponse.json({ ok: false, error: "Email, address, and items are required." }, { status: 400 });
  }

  const productIds = items.map((item) => item.productId);
  const { data: productRows, error: productError } = await supabaseAdmin
    .from("products")
    .select("id, price, discount_percent, stock")
    .in("id", productIds);

  if (productError) {
    return NextResponse.json({ ok: false, error: productError.message }, { status: 500 });
  }

  const productMap = new Map((productRows ?? []).map((row) => [row.id, row]));

  let subtotal = 0;
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      return NextResponse.json({ ok: false, error: `Product not found: ${item.productId}` }, { status: 400 });
    }
    if (product.stock < item.quantity) {
      return NextResponse.json(
        { ok: false, error: `Insufficient stock for ${item.productId}` },
        { status: 400 }
      );
    }
    const sale = computeSalePrice(product.price, product.discount_percent ?? undefined);
    subtotal += sale * item.quantity;
  }

  subtotal = Number(subtotal.toFixed(2));
  const shippingFee = typeof body.shippingFee === "number" ? body.shippingFee : subtotal >= 999 ? 0 : 99;
  const total = Number((subtotal + shippingFee).toFixed(2));

  const orderId = makeOrderId();
  const createdAt = new Date().toISOString();

  const { data: createdOrder, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      id: orderId,
      email,
      address,
      notes: body.notes ?? null,
      status: "pending",
      subtotal,
      shipping_fee: shippingFee,
      total,
      payment_proof: body.paymentProof ?? null,
      payment_verified: false,
      awb_number: null,
      created_at: createdAt,
    })
    .select("*")
    .single();

  if (orderError || !createdOrder) {
    return NextResponse.json({ ok: false, error: orderError?.message ?? "Order failed." }, { status: 500 });
  }

  const orderItems = items.map((item) => {
    const product = productMap.get(item.productId)!;
    const sale = computeSalePrice(product.price, product.discount_percent ?? undefined);
    return {
      order_id: orderId,
      product_id: item.productId,
      quantity: item.quantity,
      color: item.color ?? null,
      size: item.size ?? null,
      price: sale,
    };
  });

  const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItems);
  if (itemsError) {
    return NextResponse.json({ ok: false, error: itemsError.message }, { status: 500 });
  }

  const updateResults = await Promise.all(
    items.map((item) => {
      const product = productMap.get(item.productId)!;
      const nextStock = product.stock - item.quantity;
      return supabaseAdmin
        .from("products")
        .update({ stock: nextStock, updated_at: createdAt })
        .eq("id", item.productId);
    })
  );

  const failedUpdate = updateResults.find((result) => result.error);
  if (failedUpdate?.error) {
    return NextResponse.json({ ok: false, error: failedUpdate.error.message }, { status: 500 });
  }

  const response: Order = mapOrderRow({ ...createdOrder, order_items: orderItems });
  return NextResponse.json({ ok: true, data: response }, { status: 201 });
}
