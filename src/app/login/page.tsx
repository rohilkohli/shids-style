"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCommerceStore } from "../lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { ready, user, loginUser } = useCommerceStore();
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const storedEmail = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("shids-style/login-email") ?? "";
  }, []);

  const resolvedEmail = email ?? user?.email ?? storedEmail;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const normalizedEmail = resolvedEmail.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (!password.trim()) {
      setMessage("Please enter your password.");
      return;
    }

    if (rememberMe) {
      window.localStorage.setItem("shids-style/login-email", normalizedEmail);
    } else {
      window.localStorage.removeItem("shids-style/login-email");
    }

    try {
      const nextUser = await loginUser(normalizedEmail, password.trim());
      setLoginSuccess(true);
      setRedirecting(true);
      const nextPath = nextUser?.role === "admin" ? "/admin" : "/";
      setTimeout(() => {
        router.replace(nextPath);
      }, 1400);
    } catch (error) {
      setRedirecting(false);
      setMessage((error as Error).message);
    }
  };

  if (!ready) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 text-center text-gray-600">
          Loading...
        </div>
      </main>
    );
  }

  if (redirecting) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="relative w-full max-w-md px-6">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-pink-200/60 via-white to-indigo-100 blur-2xl" />
          <div className="rounded-3xl border border-gray-200 bg-white px-6 py-8 text-center shadow-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-2xl animate-bounce">
              ✅
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-900">You’re logged in</h1>
            <p className="mt-2 text-sm text-gray-500">Taking you to the main website now.</p>
            {loginSuccess && (
              <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full w-full animate-pulse rounded-full bg-emerald-400" />
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (user) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900">You are already signed in</h1>
          <p className="mt-2 text-sm text-gray-600">Welcome back, {user.name}.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/account" className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800">
              Go to Account
            </Link>
            <Link href="/shop" className="rounded-full border border-gray-200 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-white">
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/shids.svg" alt="Shids Style" className="h-7 sm:h-8 w-auto max-w-[160px]" />
          </Link>
        </div>
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden lg:flex flex-col justify-between rounded-3xl border border-gray-200 bg-white/70 p-10 shadow-lg">
            <div>
              <img src="/shids-style-logo.svg" alt="Shids Style" className="h-7 w-auto max-w-[160px]" />
              <h1 className="mt-4 text-4xl font-bold text-gray-900">Welcome back</h1>
              <p className="mt-3 text-sm text-gray-600">
                Sign in to track orders, manage your profile, and save your favorites.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-sm font-semibold text-gray-900">Why shop with us</p>
              <ul className="mt-3 space-y-2 text-xs text-gray-600">
                <li>• Premium fabric and limited drops.</li>
                <li>• Fast shipping and easy returns.</li>
                <li>• Priority access to new releases.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white/95 p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
                <p className="text-sm text-gray-500">Use your email to continue.</p>
              </div>
              <div className="h-12 w-12 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center text-lg">
                👤
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Email address
                <input
                  type="email"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                  value={resolvedEmail}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Password
                <div className="relative mt-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 0 1 2.042-3.368" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.223 6.223A9.956 9.956 0 0 1 12 5c4.478 0 8.268 2.943 9.542 7a9.978 9.978 0 0 1-4.018 5.016" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-300"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="font-medium text-gray-700 hover:text-black"
                  onClick={() => setMessage("Please contact support@shids.style to reset your password.")}
                >
                  Forgot password?
                </button>
              </div>

              {message && (
                <div
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                  aria-live="polite"
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-full bg-black px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-900"
              >
                Sign in
              </button>
            </form>

            <div className="mt-6">
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <div className="h-px flex-1 bg-gray-200" />
                <span>or continue with</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-black"
                  onClick={() => setMessage("Google sign-in is not enabled yet.")}
                >
                  <span className="text-base">G</span>
                  Google
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-black"
                  onClick={() => setMessage("Facebook sign-in is not enabled yet.")}
                >
                  <span className="text-base">f</span>
                  Facebook
                </button>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-gray-500">
              Use your registered email and password.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
              <span>New here?</span>
              <Link href="/register" className="font-semibold text-gray-900 hover:text-black">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
