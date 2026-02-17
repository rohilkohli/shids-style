import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/authContext";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

type SalesPoint = {
  date: string;
  sales: number;
};

const DAY_WINDOW = 30;

const formatTrendDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

export async function GET(request: NextRequest) {
  try {
    if (!await requireAdmin(request)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (DAY_WINDOW - 1));

    const [{ data: allOrders, error: allOrdersError }, { data: trendOrders, error: trendOrdersError }] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("total")
        .neq("status", "cancelled"),
      supabaseAdmin
        .from("orders")
        .select("total, created_at")
        .neq("status", "cancelled")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true }),
    ]);

    if (allOrdersError || trendOrdersError) {
      return NextResponse.json(
        { ok: false, error: allOrdersError?.message ?? trendOrdersError?.message ?? "Failed to load analytics" },
        { status: 500 }
      );
    }

    const allRows = allOrders ?? [];
    const trendRows = trendOrders ?? [];

    const totalRevenue = allRows.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
    const totalOrders = allRows.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const salesByDay = new Map<string, number>();

    trendRows.forEach((row) => {
      const createdAt = new Date(row.created_at);
      const key = toDateKey(createdAt);
      const runningTotal = salesByDay.get(key) ?? 0;
      salesByDay.set(key, runningTotal + Number(row.total ?? 0));
    });

    const salesTrend: SalesPoint[] = [];
    for (let i = 0; i < DAY_WINDOW; i += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const key = toDateKey(date);
      salesTrend.push({
        date: formatTrendDate(date),
        sales: salesByDay.get(key) ?? 0,
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        totalRevenue,
        totalOrders,
        avgOrderValue,
        salesTrend,
      },
    });
  } catch (error) {
    console.error("Failed to load analytics", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
