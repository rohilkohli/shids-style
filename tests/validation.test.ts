import test from "node:test";
import assert from "node:assert/strict";
import { createOrderSchema, loginSchema, registerSchema, trackOrderSchema } from "../src/app/lib/validation.ts";

test("login schema validates normalized payload", () => {
  const result = loginSchema.parse({ email: "  USER@EXAMPLE.COM ", password: "secret" });
  assert.equal(result.email, "user@example.com");
});

test("register schema enforces minimum password length", () => {
  const result = registerSchema.safeParse({ email: "user@example.com", name: "User", password: "123" });
  assert.equal(result.success, false);
});

test("track schema normalizes order ID casing", () => {
  const result = trackOrderSchema.parse({ orderId: "shids-ab12", email: "test@example.com" });
  assert.equal(result.orderId, "SHIDS-AB12");
});

test("create order schema rejects empty item list", () => {
  const result = createOrderSchema.safeParse({ email: "a@b.com", address: "Street 1", items: [] });
  assert.equal(result.success, false);
});
