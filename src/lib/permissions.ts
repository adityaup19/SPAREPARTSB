export type AppRole = "ADMIN" | "MANAGER" | "WORKER";
export type AppAction =
  | "inventory:view"
  | "inventory:receive"
  | "inventory:move"
  | "inventory:manage"
  | "reservation:manage"
  | "project:manage"
  | "inventory:delete"
  | "user:manage";

const permissions: Record<AppRole, ReadonlySet<AppAction>> = {
  WORKER: new Set(["inventory:view", "inventory:receive", "inventory:move"]),
  MANAGER: new Set([
    "inventory:view",
    "inventory:receive",
    "inventory:move",
    "inventory:manage",
    "reservation:manage",
    "project:manage",
  ]),
  ADMIN: new Set([
    "inventory:view",
    "inventory:receive",
    "inventory:move",
    "inventory:manage",
    "reservation:manage",
    "project:manage",
    "inventory:delete",
    "user:manage",
  ]),
};

export function hasPermission(role: AppRole, action: AppAction) {
  return permissions[role].has(action);
}

export function bootstrapAdminEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * ADMIN_EMAILS exists only to create the very first administrator. Once any
 * active admin exists, roles come exclusively from the database, so the
 * variable stops having any effect and can never re-promote anyone.
 */
export function canBootstrapAdmin({
  email,
  activeAdminCount,
  allowedEmails,
}: {
  email: string;
  activeAdminCount: number;
  allowedEmails: Set<string>;
}): boolean {
  if (activeAdminCount > 0) return false;
  return allowedEmails.has(email.trim().toLowerCase());
}
