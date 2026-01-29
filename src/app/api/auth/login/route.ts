import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { User } from "@/app/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const mapUserRow = (row: Record<string, any>): User => ({
  id: row.id,
  email: row.email,
  name: row.name ?? "SHIDS Member",
  phone: row.phone ?? undefined,
  role: row.role ?? "customer",
});

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string; password?: string };

  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Email and password are required." }, { status: 400 });
  }

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase not configured." }, { status: 500 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
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
