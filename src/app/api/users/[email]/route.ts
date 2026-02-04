import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { User } from "@/app/lib/types";

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const resolved = await params;
  const rawEmail = resolved?.email ?? "";
  const lookupSource = rawEmail || request.nextUrl.pathname.split("/").pop() || "";
  const currentEmail = decodeURIComponent(lookupSource).replace(/\s/g, "+").trim().toLowerCase();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .ilike("email", currentEmail)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: mapUserRow(data) });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const resolved = await params;
  const rawEmail = resolved?.email ?? "";
  const lookupSource = rawEmail || request.nextUrl.pathname.split("/").pop() || "";
  const currentEmail = decodeURIComponent(lookupSource).replace(/\s/g, "+").trim().toLowerCase();
  const body = (await request.json()) as { name?: string; email?: string; phone?: string | null };

  const { data: row } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .ilike("email", currentEmail)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  const nextEmail = body.email?.trim().toLowerCase() || row.email;
  if (nextEmail !== row.email) {
    const { data: exists } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", nextEmail)
      .maybeSingle();
    if (exists) {
      return NextResponse.json({ ok: false, error: "Email already in use." }, { status: 409 });
    }
  }

  const name = body.name?.trim() || row.name;
  const phone = body.phone !== undefined ? (body.phone ? body.phone.trim() : null) : row.phone;

  const { data: updated, error } = await supabaseAdmin
    .from("profiles")
    .update({
      email: nextEmail,
      name,
      phone,
    })
    .eq("id", row.id)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Update failed." }, { status: 500 });
  }

  await supabaseAdmin.auth.admin.updateUserById(row.id, {
    email: nextEmail,
    user_metadata: {
      name,
      phone: phone ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, data: mapUserRow(updated) });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const resolved = await params;
  const rawEmail = resolved?.email ?? "";
  const lookupSource = rawEmail || request.nextUrl.pathname.split("/").pop() || "";
  const currentEmail = decodeURIComponent(lookupSource).replace(/\s/g, "+").trim().toLowerCase();

  const { data: row, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .ilike("email", currentEmail)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  const { error: deleteProfileError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", row.id);

  if (deleteProfileError) {
    return NextResponse.json({ ok: false, error: deleteProfileError.message }, { status: 500 });
  }

  const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(row.id);
  if (deleteAuthError) {
    return NextResponse.json({ ok: false, error: deleteAuthError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: mapUserRow(row) });
}
