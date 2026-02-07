import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

async function isAdmin(request: NextRequest) {
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

    if (!resolvedUser) return false;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", resolvedUser.id)
      .single();
    return profile?.role === "admin";
  } catch (error) {
    console.error("Admin check failed", error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!await isAdmin(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("contact_messages")
    .select("id, name, email, message, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { name?: string; email?: string; message?: string };
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const message = body.message?.trim();

  if (!name) {
    return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ ok: false, error: "Message is required." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("contact_messages")
    .insert({ name, email, message });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
