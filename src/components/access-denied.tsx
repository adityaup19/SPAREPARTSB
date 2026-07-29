"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState } from "react";

export function AccessDenied({
  email,
  reason,
}: {
  email: string;
  reason: "no-profile" | "disabled";
}) {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createSupabaseBrowserClient().auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center">
        <h1 className="text-lg font-semibold text-gray-900">
          {reason === "disabled" ? "Access disabled" : "No access yet"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {reason === "disabled"
            ? `${email} has been signed in successfully, but an administrator has disabled this account.`
            : `${email} has been signed in successfully, but has not been granted access to the warehouse workspace.`}
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Ask a warehouse administrator to grant access from the User Admin page.
        </p>
        <button
          type="button"
          onClick={signOut}
          disabled={busy}
          className="mt-5 w-full rounded-lg bg-primary-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </main>
  );
}
