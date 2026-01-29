import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { User } from "@/app/lib/types";

type ProfileRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "admin" | "customer" | null;
  created_at?: string | null;
};

const mapUserRow = (row: ProfileRow): User & { createdAt?: string | null } => ({
  id: row.id,
  email: row.email,
  name: row.name ?? "SHIDS Member",
  phone: row.phone ?? undefined,
  role: row.role ?? "customer",
  createdAt: row.created_at ?? null,
});

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id,email,name,phone,role,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const users = (data ?? []).map((row) => mapUserRow(row as ProfileRow));
  return NextResponse.json({ ok: true, data: users });
}
