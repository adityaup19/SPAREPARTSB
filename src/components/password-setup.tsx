"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/site-url";
import { Package } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const MIN_LENGTH = 12;

type Stage = "checking" | "ready" | "unusable";

const COPY = {
  invite: {
    title: "Create your password",
    intro: "Welcome. Choose a password to finish setting up your warehouse account.",
    submit: "Create password and continue",
    unusableTitle: "Invitation link no longer valid",
  },
  recovery: {
    title: "Set a new password",
    intro: "Choose a new password for your warehouse account.",
    submit: "Save password",
    unusableTitle: "Password link no longer valid",
  },
} as const;

/**
 * Completes an emailed auth link and sets the account password.
 *
 * When Supabase uses the implicit flow it returns tokens in the URL fragment,
 * which the server callback cannot read, so the session is established here
 * before the form is shown.
 */
export function PasswordSetup({ mode }: { mode: "invite" | "recovery" }) {
  const copy = COPY[mode];
  const params = useSearchParams();
  const [stage, setStage] = useState<Stage>(() =>
    params.get("error") ? "unusable" : "checking"
  );
  const [expired, setExpired] = useState(params.get("error") === "expired");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function establishSession() {
      const supabase = createSupabaseBrowserClient();
      const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");
      const fragmentError = fragment.get("error_code") ?? fragment.get("error");

      if (fragmentError) {
        if (!active) return;
        setExpired(/expire|otp/i.test(fragmentError));
        setStage("unusable");
        return;
      }

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.history.replaceState(null, "", window.location.pathname);
        if (sessionError) {
          if (!active) return;
          setStage("unusable");
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setStage(user ? "ready" : "unusable");
    }

    if (params.get("error")) {
      setStage("unusable");
      return;
    }
    void establishSession();
    return () => {
      active = false;
    };
  }, [params]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }
    window.location.assign(safeNextPath(params.get("next")));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600">
            <Package className="h-7 w-7 text-white" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Spare Parts Tracker</h1>
            <p className="text-sm text-gray-500">Secure warehouse access</p>
          </div>
        </div>

        {stage === "checking" && (
          <p className="text-sm text-gray-500" role="status">
            Checking your link...
          </p>
        )}

        {stage === "unusable" && (
          <div>
            <h2 className="font-semibold text-gray-900">{copy.unusableTitle}</h2>
            <p className="mt-2 text-sm text-gray-600">
              {expired
                ? "This link has expired. Links stay valid for a limited time and can only be used once."
                : "This link could not be verified. It may have already been used."}
            </p>
            <p className="mt-3 text-sm text-gray-600">
              {mode === "invite"
                ? "Ask a warehouse administrator to resend your invitation from the User Admin page, then open the newest email."
                : "Request a new link from the sign-in page using “Forgot password”."}
            </p>
            <a
              href="/login"
              className="mt-5 block w-full rounded-lg bg-primary-600 px-4 py-2.5 text-center font-medium text-white hover:bg-primary-700"
            >
              Back to sign in
            </a>
            {mode === "invite" && (
              <p className="mt-4 text-xs text-gray-500">
                Already set a password before? Sign in with it instead.
              </p>
            )}
          </div>
        )}

        {stage === "ready" && (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <h2 className="font-semibold text-gray-900">{copy.title}</h2>
              <p className="mt-1 text-sm text-gray-500">{copy.intro}</p>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New password
              </label>
              <input
                id="password"
                type="password"
                minLength={MIN_LENGTH}
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <p className="mt-1 text-xs text-gray-500">
                Use at least {MIN_LENGTH} characters.
              </p>
            </div>
            <div>
              <label htmlFor="confirmation" className="block text-sm font-medium text-gray-700">
                Confirm password
              </label>
              <input
                id="confirmation"
                type="password"
                minLength={MIN_LENGTH}
                required
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
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
              {busy ? "Saving..." : copy.submit}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
