"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Package } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    params.get("error") === "config"
      ? "Authentication has not been configured. Contact an administrator."
      : ""
  );
  const [busy, setBusy] = useState(false);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
      const next = params.get("next");
      window.location.assign(next?.startsWith("/") ? next : "/");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to sign in. Try again."
      );
      setBusy(false);
    }
  }

  async function requestReset() {
    if (!email) {
      setError("Enter your work email first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      });
      if (resetError) throw resetError;
      setError("Password reset email sent. Check your inbox.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600">
            <Package className="h-7 w-7 text-white" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Spare Parts Tracker</h1>
            <p className="text-sm text-gray-500">Secure warehouse access</p>
          </div>
        </div>

        <form onSubmit={signIn} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Work email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
          <button
            type="button"
            onClick={requestReset}
            disabled={busy}
            className="w-full text-sm font-medium text-primary-700 hover:underline disabled:opacity-60"
          >
            Forgot password?
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-gray-500">
          Accounts are invitation-only. Contact your warehouse administrator.
        </p>
      </div>
    </main>
  );
}
