"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCommerceStore } from "../lib/store";

export default function RegisterPage() {
  const router = useRouter();
  const { signIn } = useCommerceStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!name.trim()) {
      setMessage("Please enter your full name.");
      return;
    }
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }
    if (!password.trim()) {
      setMessage("Please create a password.");
      return;
    }

    signIn({ email: normalizedEmail, name: name.trim() });
    router.push("/account");
  };

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden lg:flex flex-col justify-between rounded-3xl border border-gray-200 bg-white/70 p-10 shadow-lg">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-semibold">SHIDS STYLE</p>
              <h1 className="mt-4 text-4xl font-bold text-gray-900">Create your account</h1>
              <p className="mt-3 text-sm text-gray-600">
                Join to track orders, save favorites, and get early access to drops.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-sm font-semibold text-gray-900">Perks</p>
              <ul className="mt-3 space-y-2 text-xs text-gray-600">
                <li>• Faster checkout.</li>
                <li>• Order tracking in one place.</li>
                <li>• Early access to limited drops.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white/95 p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Sign up</h2>
                <p className="text-sm text-gray-500">Create your account in seconds.</p>
              </div>
              <div className="h-12 w-12 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center text-lg">
                ✨
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Full name
                <input
                  type="text"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Email address
                <input
                  type="email"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Create password
                <input
                  type="password"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a password"
                />
              </label>

              {message && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-full bg-black px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-900"
              >
                Create account
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-500">
              Already have an account?
              <Link href="/login" className="ml-1 font-semibold text-gray-900 hover:text-black">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
