"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function PaymentProcessingPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
    const timer = setTimeout(() => {
      router.push("/order-confirmation");
    }, 2800);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payment Confirmation</h1>
          <p className="mt-2 text-sm text-gray-500" aria-live="polite">
            Please wait while we verify your payment.
          </p>

          <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
            <video
              ref={videoRef}
              src="/order-received.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="mx-auto w-full max-w-md rounded-xl"
            />
            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-black/80" />
            </div>
            <p className="mt-4 text-sm text-gray-600">
              We will check and update the order status once we verify the payment.
            </p>
            <p className="mt-2 text-xs text-gray-500">Please keep this page open. Redirecting shortly.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
