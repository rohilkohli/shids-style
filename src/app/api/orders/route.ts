import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { Order } from "@/app/lib/types";
import { Resend } from "resend";
import OrderReceipt from "@/app/components/emails/OrderReceipt";
import { generateShortOrderId } from "@/app/lib/orderId";
import { generateTrackingToken, saveTrackingToken } from "@/app/lib/trackingToken";
import { resolveAuthContext } from "@/app/lib/authContext";
import { createOrderSchema } from "@/app/lib/validation";
import { logEvent } from "@/app/lib/observability";

type OrderItemRow = {
  product_id: string;
  quantity: number;
  color?: string | null;
  size?: string | null;
  price?: number | null;
};

type OrderRow = {
  id: string;
  email: string;
  address: string;
  status: Order["status"];
  total: number;
  subtotal?: number | null;
  shipping_fee?: number | null;
  discount_code?: string | null;
  discount_amount?: number | null;
  created_at: string;
  items?: OrderItemRow[] | null;
  notes?: string | null;
  awb_number?: string | null;
  payment_verified?: boolean | null;
  courier_name?: string | null;
};


export const revalidate = 0; // Disable caching for orders

async function getUser(request: NextRequest) {
  return resolveAuthContext(request);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);

    // 1. If not logged in, return empty list (or error)
    if (!user) {
      return NextResponse.json({ ok: true, data: [] }); 
    }

    let query = supabaseAdmin.from("orders").select("*, items:order_items(*)");

    // 2. PRIVACY FILTER: If not admin, ONLY show my own orders
    if (user.role !== "admin") {
      query = query.eq("email", user.email);
    }

    // 3. Fetch Data
    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Map database rows to your App's "Order" type
    const rows = (data ?? []) as OrderRow[];
    const mappedOrders: Order[] = rows.map((row) => ({
      id: row.id,
      email: row.email,
      address: row.address,
      status: row.status,
      total: Number(row.total),
      subtotal: Number(row.subtotal ?? 0),
      shippingFee: Number(row.shipping_fee ?? 0),
      discountCode: row.discount_code ?? undefined,
      discountAmount: Number(row.discount_amount ?? 0),
      createdAt: row.created_at,
      items: (row.items ?? []).map((item) => ({
        productId: item.product_id,
        quantity: item.quantity,
        color: item.color ?? undefined,
        size: item.size ?? undefined,
        price: Number(item.price ?? 0)
      })),
      notes: row.notes ?? undefined,
      awbNumber: row.awb_number ?? undefined,
      paymentVerified: row.payment_verified ?? undefined,
      courierName: row.courier_name ?? undefined
    }));

    return NextResponse.json({ ok: true, data: mappedOrders });
  } catch (error) {
    console.error("Failed to load orders", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Allow anyone to CREATE an order (Guest checkout), but validation is good.
  // Ideally, we link it to the user if they are logged in.
  
  // Check if user is logged in
  const user = await getUser(request);
  const isGuest = !user;
  
  const parsed = createOrderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }
  const body = parsed.data;
  const now = new Date().toISOString();

  const normalizedItems = body.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    color: item.color ?? null,
    size: item.size ?? null,
  }));

  if (!normalizedItems.length) {
    return NextResponse.json({ ok: false, error: "Order items are required." }, { status: 400 });
  }

  const productIds = normalizedItems.map((item) => item.productId);
  const { data: productsData, error: productsError } = await supabaseAdmin
    .from("products")
    .select("id, name, price, discount_percent, stock")
    .in("id", productIds);

  if (productsError) {
    return NextResponse.json({ ok: false, error: productsError.message }, { status: 500 });
  }

  const productMap = new Map(
    (productsData ?? []).map((product: { id: string; name: string; price: number; discount_percent: number | null; stock: number }) => [
      product.id,
      product,
    ])
  );

  let subtotal = 0;
  let itemsPayload: {
    order_id: string;
    product_id: string;
    quantity: number;
    color: string | null;
    size: string | null;
    price: number;
    name: string;
  }[] = [];

  try {
    itemsPayload = normalizedItems.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      const discountPercent = Number(product.discount_percent ?? 0);
      const salePrice = discountPercent > 0
        ? Number((Number(product.price) * (1 - discountPercent / 100)).toFixed(2))
        : Number(product.price);
      subtotal += salePrice * item.quantity;
      return {
        order_id: "",
        product_id: item.productId,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
        price: salePrice,
        name: product.name,
      };
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }

  const requestedDiscountCode = body.discountCode?.trim().toUpperCase();
  let discountAmount = 0;
  let appliedDiscountCode: string | null = null;
  let appliedDiscountId: string | null = null;

  if (requestedDiscountCode) {
    const { data: discountRow, error: discountError } = await supabaseAdmin
      .from("discount_codes")
      .select("id, code, type, value, max_uses, used_count, expiry_date, is_active")
      .ilike("code", requestedDiscountCode)
      .maybeSingle();

    if (discountError || !discountRow || !discountRow.is_active) {
      return NextResponse.json({ ok: false, error: "Invalid or inactive discount code." }, { status: 400 });
    }

    if (discountRow.expiry_date && new Date(discountRow.expiry_date) < new Date()) {
      return NextResponse.json({ ok: false, error: "This discount code has expired." }, { status: 400 });
    }

    if (discountRow.max_uses && discountRow.used_count >= discountRow.max_uses) {
      return NextResponse.json({ ok: false, error: "This discount code has reached its usage limit." }, { status: 400 });
    }

    if (discountRow.type === "percentage") {
      discountAmount = Number((subtotal * (Number(discountRow.value) / 100)).toFixed(2));
    } else {
      discountAmount = Number(discountRow.value ?? 0);
    }

    discountAmount = Math.max(0, Math.min(discountAmount, subtotal));
    appliedDiscountCode = discountRow.code;
    appliedDiscountId = discountRow.id;
  }

  const shippingFee = Number(body.shippingFee ?? 0);
  const total = Number((subtotal - discountAmount + shippingFee).toFixed(2));

  let orderId = "";
  if (body.orderId && /^SHIDS-[A-Z0-9]{4}$/.test(body.orderId)) {
    const { data: existing } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("id", body.orderId)
      .maybeSingle();
    if (!existing) {
      orderId = body.orderId;
    }
  }

  if (!orderId) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateShortOrderId();
      const { data: existing } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("id", candidate)
        .maybeSingle();
      if (!existing) {
        orderId = candidate;
        break;
      }
    }
  }

  if (!orderId) {
    return NextResponse.json({ ok: false, error: "Failed to generate order ID." }, { status: 500 });
  }

  const atomicOrderPayload = {
    id: orderId,
    email: body.email,
    address: body.address,
    notes: body.notes,
    status: "pending",
    subtotal,
    shipping_fee: shippingFee,
    discount_code: appliedDiscountCode,
    discount_amount: discountAmount || null,
    total,
    created_at: now,
  };

  const atomicItemsPayload = itemsPayload.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    color: item.color,
    size: item.size,
    price: item.price,
  }));

  const { data: order, error: orderError } = await supabaseAdmin.rpc("create_order_atomic", {
    p_discount_id: appliedDiscountId,
    p_items: atomicItemsPayload,
    p_order: atomicOrderPayload,
  });

  if (orderError) {
    logEvent("error", "order_create_atomic_failed", { error: orderError.message, email: body.email });
    return NextResponse.json({ ok: false, error: orderError.message }, { status: 500 });
  }

  // Generate tracking token for guest orders
  let trackingToken: string | null = null;
  if (isGuest) {
    trackingToken = generateTrackingToken(orderId);
    await saveTrackingToken(orderId, trackingToken);
  }

  const orderItems = atomicItemsPayload.map((item) => ({
    order_id: order.id as string,
    product_id: item.product_id,
    quantity: item.quantity,
    color: item.color,
    size: item.size,
    price: item.price,
  }));

  try {
    const resend = new Resend(process.env.RESEND_API_KEY ?? "");
    const emailItems = itemsPayload.map((item) => ({
      name: item.name ?? item.product_id,
      qty: Number(item.quantity ?? 1),
      price: Number(item.price ?? 0),
    }));

    // Calculate estimated delivery (7-10 calendar days from now)
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + 7);
    const estimatedDelivery = `${estimatedDate.toLocaleDateString("en-IN", { 
      weekday: "short", 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    })} - ${new Date(estimatedDate.getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { 
      weekday: "short", 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    })}`;

    await resend.emails.send({
      from: "SHIDS STYLE <wecare@shidstyle.com>",
      to: [body.email],
      subject: `Your SHIDS STYLE receipt — ${order.id}`,
      react: OrderReceipt({
        orderId: order.id,
        customerName: body.name ?? body.email?.split("@")[0] ?? "",
        items: emailItems,
        total: Number(order.total ?? total),
        shippingAddress: body.address,
        estimatedDelivery: estimatedDelivery,
      }),
    });
  } catch (error) {
    logEvent("warn", "order_email_failed", { orderId: order.id, error: (error as Error).message });
  }

  logEvent("info", "order_created", { orderId: order.id, isGuest });

  return NextResponse.json({
    ok: true,
    data: {
      ...order,
      discountCode: order.discount_code ?? undefined,
      discountAmount: order.discount_amount ?? undefined,
      trackingToken, // Include for guest orders only
      items: orderItems.map((item) => ({
        productId: item.product_id,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
        price: item.price,
      })),
    },
  });
}