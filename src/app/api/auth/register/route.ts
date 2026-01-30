import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { User } from "@/app/lib/types";

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
  const body = (await request.json()) as { email?: string; password?: string; name?: string };

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();
  const password = body.password?.trim();

  if (!email || !name || !password || password.length < 6) {
    return NextResponse.json({ ok: false, error: "Name, email and password (min 6 chars) are required." }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (error || !data.user) {
    const status = error?.status === 400 || error?.status === 409 ? 409 : 400;
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
