import { resolveSiteUrl } from "@/lib/site-url";

/**
 * Where an emailed invitation or password link returns to. Invited users land on
 * the password screen rather than the sign-in form, because they have no
 * password yet.
 */
export function invitationRedirectUrl(requestOrigin: string) {
  const base = resolveSiteUrl(process.env, requestOrigin);
  return `${base}/auth/callback?next=/auth/set-password`;
}
