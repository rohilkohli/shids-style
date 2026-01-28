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
          <p className="mt-2 text-sm text-gray-500">Please wait while we verify your payment.</p>

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
            <p className="mt-4 text-sm text-gray-600">
              We will check and update the order status once we verify the payment.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
