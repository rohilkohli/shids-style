"use client";

import { useState } from "react";
import { useCommerceStore } from "@/app/lib/store";
import { useToast } from "./Toast";
import { X } from "lucide-react";

interface CreateAccountPromptProps {
  email: string;
  name: string;
  onClose: () => void;
}

export function CreateAccountPrompt({ email, name, onClose }: CreateAccountPromptProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { registerUser } = useCommerceStore();
  const { toast } = useToast();

  const handleCreateAccount = async () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await registerUser(name || "Guest", email, password);
      toast.success("Account created! Please check your email to verify.");
      onClose();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    window.localStorage.setItem("account-prompt-dismissed", "true");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
        <button
          type="button"
          onClick={handleSkip}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Create an Account?</h3>
          <p className="text-sm text-gray-600">
            Save your order details and track all your purchases in one place!
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              disabled
              value={email}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Create Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
              autoFocus
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleCreateAccount}
            disabled={loading || password.length < 6}
            className="flex-1 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500 text-center">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
