import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import type { User } from "@/app/lib/types";

type ProfileRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  role: "admin" | "customer" | null;
};

const mapUserRow = (row: ProfileRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name ?? "SHIDS Member",
  phone: row.phone ?? undefined,
  addressLine1: row.address_line1 ?? null,
  addressLine2: row.address_line2 ?? null,
  city: row.city ?? null,
  state: row.state ?? null,
  postalCode: row.postal_code ?? null,
  country: row.country ?? null,
  role: row.role ?? "customer",
});

async function getUser(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    let resolvedUser = user;

    if (!resolvedUser) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabaseAdmin.auth.getUser(token);
        resolvedUser = data.user ?? null;
      }
    }

    if (!resolvedUser) return null;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, email")
      .eq("id", resolvedUser.id)
      .single();

    return {
      id: resolvedUser.id,
      email: resolvedUser.email,
      role: profile?.role ?? "customer",
    };
  } catch (error) {
    console.error("Failed to resolve user", error);
    return null;
  }
}

const canAccess = (user: { email?: string | null; role: string } | null, targetEmail: string) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return (user.email ?? "").toLowerCase() === targetEmail.toLowerCase();
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const resolved = await params;
  const rawEmail = resolved?.email ?? "";
  const lookupSource = rawEmail || request.nextUrl.pathname.split("/").pop() || "";
  const currentEmail = decodeURIComponent(lookupSource).replace(/\s/g, "+").trim().toLowerCase();

  const user = await getUser(request);
  if (!canAccess(user, currentEmail)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  };

  const user = await getUser(request);
  if (!canAccess(user, currentEmail)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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
  const addressLine1 = body.addressLine1 !== undefined ? (body.addressLine1 ? body.addressLine1.trim() : null) : row.address_line1;
  const addressLine2 = body.addressLine2 !== undefined ? (body.addressLine2 ? body.addressLine2.trim() : null) : row.address_line2;
  const city = body.city !== undefined ? (body.city ? body.city.trim() : null) : row.city;
  const state = body.state !== undefined ? (body.state ? body.state.trim() : null) : row.state;
  const postalCode = body.postalCode !== undefined ? (body.postalCode ? body.postalCode.trim() : null) : row.postal_code;
  const country = body.country !== undefined ? (body.country ? body.country.trim() : null) : row.country;

  const { data: updated, error } = await supabaseAdmin
    .from("profiles")
    .update({
      email: nextEmail,
      name,
      phone,
      address_line1: addressLine1,
      address_line2: addressLine2,
      city,
      state,
      postal_code: postalCode,
      country,
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

  const user = await getUser(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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
