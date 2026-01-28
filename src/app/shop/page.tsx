import { Suspense } from "react";
import ShopClient from "./ShopClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ShopPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[color:var(--background)]" />}
    >
      <ShopClient />
    </Suspense>
  );
}
