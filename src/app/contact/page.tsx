"use client";

import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="py-10 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Contact Us</h1>
            <p className="mt-2 text-sm text-gray-600">We usually reply within 24 hours.</p>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSent(true);
                  setForm({ name: "", email: "", message: "" });
                }}
              >
                <label className="text-sm font-medium text-gray-700">
                  Name
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Email
                  <input
                    type="email"
                    required
                    className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Message
                  <textarea
                    rows={5}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none"
                    value={form.message}
                    onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                  />
                </label>

                {sent && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    Message sent successfully. We will be in touch soon.
                  </div>
                )}

                <button className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800">
                  Send Message
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
                  <p className="mt-2">Instagram · @shids.style</p>
                  <p>YouTube · SHIDS STYLE</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">Address</p>
                  <p className="mt-2">SHIDS STYLE Studio</p>
                  <p>Sector 45, Gurgaon, India</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
