/**
 * Absolute base URL for links that leave the app, such as invitation emails.
 *
 * Emails must point at the canonical production domain rather than the
 * per-deployment Vercel hostname, and must never point at localhost from a
 * deployed environment. The request origin is only used for local development.
 */
export function resolveSiteUrl(
  env: Record<string, string | undefined>,
  requestOrigin: string
): string {
  const explicit = normalize(env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit;

  const productionHost = normalize(env.VERCEL_PROJECT_PRODUCTION_URL);
  if (productionHost) return productionHost;

  const deploymentHost = normalize(env.VERCEL_URL);
  if (deploymentHost) return deploymentHost;

  return normalize(requestOrigin) ?? "http://localhost:3000";
}

function normalize(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/** Restricts post-login redirects to in-app paths so links cannot be hijacked. */
export function safeNextPath(value: string | null, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
