"use client";

import type { AppUser } from "@prisma/client";
import { createContext, useContext } from "react";

const AuthContext = createContext<AppUser | null>(null);

export function AuthProvider({
  user,
  children,
}: {
  user: AppUser;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useCurrentUser() {
  const user = useContext(AuthContext);
  // Protected pages can be pre-rendered before a request/session exists.
  // The fallback only controls visible buttons; every API still enforces RBAC.
  return user ?? ({ role: "WORKER" } as AppUser);
}
