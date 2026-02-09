"use client";

import Image from "next/image";
import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* UI polish: clarified hierarchy and spacing for contact layout. */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex justify-center mb-8">
              <Image
                src="/shids-full-size-logo.svg"
                alt="Shids Style"
                width={500}
                height={125}
                className="h-32 sm:h-40 w-auto max-w-[500px] object-contain"
              />
            </div>
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Contact Us</h1>
              <p className="mt-2 text-sm text-gray-600">We usually reply within 24 hours.</p>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <form
                className="space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setSubmitting(true);
                  setError(null);
                  setSent(false);
                  try {
                    const response = await fetch("/api/contact", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: form.name,
                        email: form.email,
                        message: form.message,
                      }),
                    });
                    const json = await response.json();
                    if (!response.ok || !json.ok) {
                      throw new Error(json.error || "Failed to send message.");
                    }
                    setSent(true);
                    setForm({ name: "", email: "", message: "" });
                  } catch (err) {
                    setError((err as Error).message);
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                <label className="text-sm font-medium text-gray-700">
                  Name
                  <input
                    required
                    className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Email
                  <input
                    type="email"
                    required
                    className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Message
                  <textarea
                    rows={5}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                    value={form.message}
                    onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                  />
                </label>

                {sent && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700" aria-live="polite">
                    Message sent successfully. We will be in touch soon.
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" aria-live="polite">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:opacity-60"
                >
                  {submitting ? "Sending..." : "Send Message"}
                </button>
              </form>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 space-y-4 text-sm text-gray-600">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">Customer Care</p>
                  <p className="mt-2 text-gray-900 font-medium">support@shids.style</p>
                  <p className="text-xs text-gray-500">Mon–Sat · 10:00am–6:00pm</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">Social</p>
                  <p className="mt-2">Instagram ·{" "}<a href="https://www.instagram.com/shids.style?igsh=MXUydTRpNmdweXdoaQ==" target="_blank" rel="noopener noreferrer">@shids.style</a></p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">Address</p>
                  <p className="mt-2">SHIDS STYLE Studio</p>
                  <p>Sector-142, Near Advant Business Park, Noida, India</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">Quick Links</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <a
                      href="/track"
                      className="rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                    >
                      Track Order
                    </a>
                    <a
                      href="/returns-policy"
                      className="rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                    >
                      Returns Policy
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
