import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const isConfigured = Boolean(supabaseUrl && supabaseServiceKey);

let cachedClient: SupabaseClient | null = null;

const getClient = () => {
  if (cachedClient) return cachedClient;
  if (!isConfigured) {
    throw new Error("Supabase admin client is missing env vars.");
  }
  cachedClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (...args) => fetch(...args),
    },
  });
  return cachedClient;
};

export const supabaseAdmin: SupabaseClient = isConfigured
  ? new Proxy(
      {},
      {
        get(_target, prop) {
          return (getClient() as any)[prop as keyof SupabaseClient];
        },
      }
    ) as SupabaseClient
  : (new Proxy(
      {},
      {
        get() {
          throw new Error("Supabase admin client is missing env vars.");
        },
      }
    ) as SupabaseClient);
