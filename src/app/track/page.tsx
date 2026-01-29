import { Suspense } from "react";
import TrackClient from "./TrackClient";

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[color:var(--background)]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
            <div className="rounded-2xl border border-gray-100 bg-white/80 p-6 sm:p-8 shadow-sm">
              <div className="h-6 w-40 rounded bg-gray-200" />
              <div className="mt-3 h-4 w-64 rounded bg-gray-200" />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="h-12 rounded-lg bg-gray-100" />
                <div className="h-12 rounded-lg bg-gray-100" />
              </div>
              <div className="mt-6 h-11 w-40 rounded-full bg-gray-200" />
            </div>
          </div>
        </main>
      }
    >
      <TrackClient />
    </Suspense>
  );
}
