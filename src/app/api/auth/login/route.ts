import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { User } from "@/app/lib/types";
import { loginSchema } from "@/app/lib/validation";
import { logEvent } from "@/app/lib/observability";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type ProfileRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "admin" | "customer" | null;
};

const mapUserRow = (row: ProfileRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name ?? "SHIDS Member",
  phone: row.phone ?? undefined,
  role: row.role ?? "customer",
});

export async function POST(request: NextRequest) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Email and password are required." }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    logEvent("warn", "login_failed", { email, reason: error?.message ?? "invalid_credentials" });
    return NextResponse.json({ ok: false, error: "Invalid credentials." }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .ilike("email", email)
    .maybeSingle();

  if (profile) {
    return NextResponse.json({ ok: true, data: mapUserRow(profile) });
  }

  logEvent("info", "login_success", { email, userId: data.user.id });

  return NextResponse.json({
    ok: true,
    data: {
      id: data.user.id,
      email: data.user.email ?? email,
      name: (data.user.user_metadata?.name as string) || "SHIDS Member",
      phone: data.user.user_metadata?.phone || undefined,
      role: data.user.app_metadata?.role || undefined,
    },
  });
}
