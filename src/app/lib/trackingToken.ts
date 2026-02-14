import crypto from "crypto";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

/**
 * Generate secure tracking token for guest orders
 */
export function generateTrackingToken(orderId: string): string {
  const randomBytes = crypto.randomBytes(16).toString("hex");
  return `${orderId}-${randomBytes}`;
}

/**
 * Save tracking token to database
 */
export async function saveTrackingToken(orderId: string, token: string): Promise<boolean> {
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

  const { error } = await supabaseAdmin.from("order_tracking_tokens").insert({
    order_id: orderId,
    token,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error("Failed to save tracking token:", error);
    return false;
  }

  return true;
}

/**
 * Verify tracking token and return order ID if valid
 */
export async function verifyTrackingToken(token: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("order_tracking_tokens")
    .select("order_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;

  // Check if token is expired
  if (new Date(data.expires_at) < new Date()) {
    return null;
  }

  return data.order_id;
}
