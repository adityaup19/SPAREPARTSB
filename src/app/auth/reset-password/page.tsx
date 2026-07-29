"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { FormEvent, useState } from "react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    window.location.assign("/");
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <form
        onSubmit={updatePassword}
        className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm"
      >
        <h1 className="text-xl font-bold text-gray-900">Set your password</h1>
        <p className="mt-2 text-sm text-gray-500">
          Use at least 12 characters for your warehouse account.
        </p>
        <label htmlFor="new-password" className="mt-6 block text-sm font-medium">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          minLength={12}
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"
        />
        {message && <p role="alert" className="mt-3 text-sm text-red-600">{message}</p>}
        <button
          disabled={busy}
          className="mt-5 w-full rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white disabled:opacity-60"
        >
          {busy ? "Saving..." : "Set password"}
        </button>
      </form>
    </main>
  );
}
