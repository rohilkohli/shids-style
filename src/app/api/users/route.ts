import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

// Helper: Check Admin
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
  try {
    // LOCK: Only Admins can see the list of all users
    if (!await isAdmin(request)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("Failed to load users", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}