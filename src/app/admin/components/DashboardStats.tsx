"use client";

import { useEffect, useMemo, useState } from "react";
import { DollarSign, ReceiptText, ShoppingCart } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/app/lib/utils";

type AnalyticsPayload = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  salesTrend: Array<{ date: string; sales: number }>;
};

const EmptyAnalytics: AnalyticsPayload = {
  totalRevenue: 0,
  totalOrders: 0,
  avgOrderValue: 0,
  salesTrend: [],
};

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="mt-3 h-9 w-36 rounded bg-slate-100" />
    </div>
  );
}

export default function DashboardStats() {
  const [analytics, setAnalytics] = useState<AnalyticsPayload>(EmptyAnalytics);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadAnalytics = async () => {
      try {
        const response = await fetch("/api/admin/analytics", { cache: "no-store" });
        const json = await response.json();

        if (!mounted) return;
        if (response.ok && json?.ok) {
          setAnalytics({ ...EmptyAnalytics, ...(json.data as AnalyticsPayload) });
        }
      } catch (error) {
        console.warn("Failed to load analytics", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();
    return () => {
      mounted = false;
    };
  }, []);

  const cardData = useMemo(
    () => [
      {
        label: "Total Revenue",
        value: formatCurrency(analytics.totalRevenue),
        icon: DollarSign,
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-700",
      },
      {
        label: "Total Orders",
        value: analytics.totalOrders.toLocaleString(),
        icon: ShoppingCart,
        iconBg: "bg-indigo-100",
        iconColor: "text-indigo-700",
      },
      {
        label: "Avg. Order Value",
        value: formatCurrency(analytics.avgOrderValue),
        icon: ReceiptText,
        iconBg: "bg-violet-100",
        iconColor: "text-violet-700",
      },
    ],
    [analytics]
  );

  return (
    <section className="mb-6 space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }, (_, index) => <StatCardSkeleton key={index} />)
          : cardData.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <div className={`rounded-full p-2 ${card.iconBg}`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900">{card.value}</p>
              </div>
            );
          })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="text-lg font-bold text-slate-900">Sales Trend (Last 30 Days)</h2>
        <div className="mt-4 h-72 w-full">
          {loading ? (
            <div className="h-full animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.salesTrend} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} interval={4} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fill="url(#salesArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
