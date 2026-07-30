import { logger } from "@/lib/logger";
import { safeNextPath } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const OTP_TYPES: EmailOtpType[] = [
  "invite",
  "recovery",
  "signup",
  "magiclink",
  "email",
  "email_change",
];

/**
 * Landing point for every Supabase email link.
 *
 * Supabase sends one of three shapes depending on project settings, so all are
 * handled: a PKCE `code`, a `token_hash` to verify, or tokens in the URL
 * fragment. Fragments never reach the server, so that case is forwarded to the
 * destination page, which finishes establishing the session in the browser.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNextPath(params.get("next"));
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const linkError = params.get("error") ?? params.get("error_code");
  const linkErrorDetail = [
    params.get("error"),
    params.get("error_code"),
    params.get("error_description"),
  ]
    .filter(Boolean)
    .join(" ");

  const failure = (reason: "expired" | "invalid") =>
    NextResponse.redirect(
      new URL(
        next.startsWith("/auth/") ? `${next}?error=${reason}` : `/login?error=${reason}`,
        request.url
      )
    );

  if (linkError) {
    logger.warn("Auth email link rejected by Supabase", {
      reason: linkError,
      description: params.get("error_description") ?? undefined,
    });
    return failure(/expired|otp/i.test(linkErrorDetail) ? "expired" : "invalid");
  }

  if (tokenHash && type) {
    if (!OTP_TYPES.includes(type as EmailOtpType)) return failure("invalid");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (error) {
      logger.warn("Auth link verification failed", { reason: error.message });
      return failure(/expire/i.test(error.message) ? "expired" : "invalid");
    }
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logger.warn("Auth code exchange failed", { reason: error.message });
      return failure(/expire/i.test(error.message) ? "expired" : "invalid");
    }
    return NextResponse.redirect(new URL(next, request.url));
  }

  // Implicit flow: the tokens are in the fragment, which only the browser can
  // read. Browsers carry the fragment across this redirect.
  return NextResponse.redirect(new URL(next, request.url));
}
