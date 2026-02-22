import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey =
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
	"";

export const isLegacySupabaseClientConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isLegacySupabaseClientConfigured
	? createClient(supabaseUrl, supabaseAnonKey)
	: (new Proxy({} as ReturnType<typeof createClient>, {
		get() {
			throw new Error("Supabase client env vars are missing.");
		},
	}) as ReturnType<typeof createClient>);
