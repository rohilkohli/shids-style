import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export type AuthContext = {
  id: string;
  email: string | null;
  role: "admin" | "customer";
};

export async function resolveAuthContext(request: NextRequest): Promise<AuthContext | null> {
  let resolvedUser: User | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    resolvedUser = user;
  } catch {
    // Continue with bearer-token fallback when server-cookie auth is unavailable.
  }

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
