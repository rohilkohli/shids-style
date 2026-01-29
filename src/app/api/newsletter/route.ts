import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from("newsletter_emails")
    .select("id, email, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("newsletter_emails")
    .upsert({ email }, { onConflict: "email" });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { email } }, { status: 201 });
}
