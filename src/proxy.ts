import { updateSession } from "@/app/lib/supabase/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { logEvent } from "@/app/lib/observability";

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

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const rule = shouldRateLimit(pathname);
  if (rule) {
    const key = `${rule.prefix}:${getClientKey(request)}`;
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
      p_identifier: key,
      p_limit: rule.limit,
      p_window_ms: RATE_LIMIT_WINDOW_MS,
    });

    if (error) {
      logEvent("warn", "rate_limit_check_failed", { error: error.message, key });
    } else if (data && !data.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(data.retry_after_seconds ?? 60),
          },
        }
      );
    }
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
