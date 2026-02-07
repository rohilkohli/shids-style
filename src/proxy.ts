import { updateSession } from "@/app/lib/supabase/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type RateEntry = { count: number; resetAt: number };

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMITS: Array<{ prefix: string; limit: number }> = [
  { prefix: "/api/auth/login", limit: 10 },
  { prefix: "/api/auth/register", limit: 8 },
  { prefix: "/api/newsletter", limit: 30 },
  { prefix: "/api/orders/track", limit: 30 },
  { prefix: "/api/orders", limit: 40 },
];

const getClientKey = (request: NextRequest) => {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
};

const shouldRateLimit = (pathname: string) => RATE_LIMITS.find((rule) => pathname.startsWith(rule.prefix));

const getRateStore = () => {
  const globalAny = globalThis as typeof globalThis & { __rateLimitStore?: Map<string, RateEntry> };
  if (!globalAny.__rateLimitStore) {
    globalAny.__rateLimitStore = new Map<string, RateEntry>();
  }
  return globalAny.__rateLimitStore;
};

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const rule = shouldRateLimit(pathname);
  if (rule) {
    const store = getRateStore();
    const key = `${rule.prefix}:${getClientKey(request)}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    } else {
      entry.count += 1;
      if (entry.count > rule.limit) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return NextResponse.json(
          { ok: false, error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfter),
            },
          }
        );
      }
      store.set(key, entry);
    }
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
