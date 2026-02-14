import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { User } from "@/app/lib/types";
import { registerSchema } from "@/app/lib/validation";
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
  const parsed = registerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Name, email and password (min 6 chars) are required." }, { status: 400 });
  }

  const { email, name, password } = parsed.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (error || !data.user) {
    const status = error?.status === 400 || error?.status === 409 ? 409 : 400;
    logEvent("warn", "register_failed", { email, reason: error?.message ?? "unknown" });
    return NextResponse.json({ ok: false, error: error?.message ?? "Email already registered." }, { status });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .ilike("email", email)
    .maybeSingle();

  if (profile) {
    return NextResponse.json({ ok: true, data: mapUserRow(profile) }, { status: 201 });
  }

  logEvent("info", "register_success", { email, userId: data.user.id });

  return NextResponse.json(
    {
      ok: true,
      data: {
        id: data.user.id,
        email: data.user.email ?? email,
        name,
        phone: undefined,
        role: data.user.app_metadata?.role || undefined,
      },
    },
    { status: 201 }
  );
}
