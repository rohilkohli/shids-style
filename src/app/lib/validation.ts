import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().trim().min(1),
});

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1),
  password: z.string().trim().min(6),
});

export const trackOrderSchema = z.object({
  orderId: z.string().trim().min(1).transform((value) => decodeURIComponent(value).trim().toUpperCase()),
  email: z.string().trim().toLowerCase().email().transform((value) => decodeURIComponent(value).trim().toLowerCase()),
});

export const orderItemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1),
  color: z.string().trim().min(1).nullable().optional(),
  size: z.string().trim().min(1).nullable().optional(),
});

export const createOrderSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  address: z.string().trim().min(5),
  items: z.array(orderItemSchema).min(1),
  shippingFee: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  name: z.string().optional(),
  discountCode: z.string().trim().optional(),
  orderId: z.string().trim().regex(/^SHIDS-[A-Z0-9]{4}$/).optional(),
});
