// ============================================================================
// Order Status Utilities
// ============================================================================

export type OrderStatus = "pending" | "paid" | "shipped" | "fulfilled" | "cancelled";

// Statuses that indicate a successful/complete order
const COMPLETE_STATUSES: OrderStatus[] = ["paid", "fulfilled", "shipped"];

/**
 * Check if an order status represents a completed/successful order
 */
export function isOrderComplete(status: string): boolean {
  return COMPLETE_STATUSES.includes(status as OrderStatus);
}

/**
 * Get the color classes for an order status badge
 * Returns Tailwind classes for background and text color
 */
export function getOrderStatusColor(status: string): string {
  if (isOrderComplete(status)) {
    return "bg-green-100 text-green-800";
  }
  return "bg-amber-100 text-amber-800";
}

/**
 * Get hover-enabled color classes for an order status badge
 */
export function getOrderStatusColorWithHover(status: string): string {
  if (isOrderComplete(status)) {
    return "bg-green-100 text-green-800 hover:bg-green-200";
  }
  return "bg-amber-100 text-amber-800 hover:bg-amber-200";
}

/**
 * Get the display label for an order status
 */
export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    paid: "Paid",
    shipped: "Shipped",
    fulfilled: "Fulfilled",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}
