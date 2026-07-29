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
