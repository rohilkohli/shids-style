"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const isSupabaseClientConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const shouldAutoRefresh = process.env.NODE_ENV !== "development";

export const supabase = isSupabaseClientConfigured
  ? createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: shouldAutoRefresh,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
  : (new Proxy({} as ReturnType<typeof createBrowserClient>, {
    get() {
      throw new Error("Supabase client env vars are missing.");
    },
  }) as ReturnType<typeof createBrowserClient>);
