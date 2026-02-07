"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase client env vars are missing.");
}

const shouldAutoRefresh = process.env.NODE_ENV !== "development";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: shouldAutoRefresh,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
