import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { NextRequest } from "next/server";

export type AuthContext = {
  id: string;
  email: string | null;
  role: "admin" | "customer";
};

export async function resolveAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    .select("role")
    .eq("id", resolvedUser.id)
    .single();

  return {
    id: resolvedUser.id,
    email: resolvedUser.email ?? null,
    role: profile?.role === "admin" ? "admin" : "customer",
  };
}

export async function requireAdmin(request: NextRequest): Promise<boolean> {
  const auth = await resolveAuthContext(request);
  return auth?.role === "admin";
}
