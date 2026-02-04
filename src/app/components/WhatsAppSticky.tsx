"use client";

import { useMemo, useState } from "react";

const WHATSAPP_NUMBER = "917007866187";

export default function WhatsAppSticky() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const whatsappUrl = useMemo(() => {
    const text = message.trim();
    const query = text ? `?text=${encodeURIComponent(text)}` : "";
    return `https://wa.me/${WHATSAPP_NUMBER}${query}`;
  }, [message]);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 w-72 overflow-hidden rounded-3xl border border-emerald-100 bg-white/95 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-2 bg-emerald-600 px-4 py-3 text-white">
            <img src="/whatsapp-icon.svg" alt="WhatsApp" className="h-5 w-5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-50">WhatsApp Support</p>
              <p className="text-[11px] text-emerald-100">We reply quickly</p>
            </div>
          </div>
          <div className="p-4">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Your message</label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type your message..."
              className="mt-2 h-20 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 focus:border-emerald-400 focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition hover:-translate-y-0.5 hover:bg-emerald-700"
              >
                Send
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 2 11 13" />
                  <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-transparent transition hover:-translate-y-1"
        aria-label="Chat on WhatsApp"
      >
        <img src="/whatsapp-icon.svg" alt="WhatsApp" className="h-11 w-11" />
        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-semibold text-white shadow">
          1
        </span>
      </button>
    </div>
  );
}
