import { prisma } from "@/lib/db";
import { bootstrapAdminEmails, canBootstrapAdmin } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppUser, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

const ALL_ROLES: UserRole[] = ["ADMIN", "MANAGER", "WORKER"];

/**
 * Outcome of resolving a request's identity. Supabase proves who someone is;
 * whether they may use the app, and as what, comes from the AppUser table.
 */
export type SessionState =
  | { status: "anonymous" }
  | { status: "denied"; email: string; reason: "no-profile" | "disabled" }
  | { status: "active"; user: AppUser };

function identityName(metadata: Record<string, unknown> | undefined) {
  const value = metadata?.full_name ?? metadata?.display_name ?? metadata?.name;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function getSession(): Promise<SessionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();
    if (error || !authUser?.email) return { status: "anonymous" };

    const email = authUser.email.toLowerCase();
    const displayName = identityName(authUser.user_metadata);
    const existing = await prisma.appUser.findUnique({ where: { id: authUser.id } });

    if (existing) {
      if (!existing.active) return { status: "denied", email, reason: "disabled" };
      const needsSync =
        existing.email !== email ||
        (!!displayName && existing.displayName !== displayName);
      if (!needsSync) return { status: "active", user: existing };
      const user = await prisma.appUser.update({
        where: { id: existing.id },
        data: { email, displayName: displayName ?? existing.displayName },
      });
      return { status: "active", user };
    }

    // An identity with no profile has no access, so the User Admin page stays
    // the only way people are added. The lone exception bootstraps the first
    // administrator when the database has none.
    const activeAdminCount = await prisma.appUser.count({
      where: { role: "ADMIN", active: true },
    });
    if (
      !canBootstrapAdmin({
        email,
        activeAdminCount,
        allowedEmails: bootstrapAdminEmails(process.env.ADMIN_EMAILS),
      })
    ) {
      return { status: "denied", email, reason: "no-profile" };
    }

    const user = await prisma.appUser.create({
      data: {
        id: authUser.id,
        email,
        displayName: displayName ?? email.split("@")[0],
        role: "ADMIN",
      },
    });
    return { status: "active", user };
  } catch {
    return { status: "anonymous" };
  }
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await getSession();
  return session.status === "active" ? session.user : null;
}

export async function authorize(
  allowed: UserRole[] = ALL_ROLES
): Promise<{ user: AppUser; response?: never } | { user?: never; response: NextResponse }> {
  const session = await getSession();
  if (session.status !== "active") {
    const message =
      session.status === "denied" && session.reason === "disabled"
        ? "Your access has been disabled. Contact an administrator."
        : session.status === "denied"
          ? "Your account has not been granted access to this workspace."
          : "Authentication required";
    return {
      response: NextResponse.json(
        { error: message },
        { status: session.status === "denied" ? 403 : 401 }
      ),
    };
  }
  if (!allowed.includes(session.user.role)) {
    return {
      response: NextResponse.json(
        { error: "You do not have permission to perform this action" },
        { status: 403 }
      ),
    };
  }
  return { user: session.user };
}

export function canManage(user: Pick<AppUser, "role">) {
  return user.role === "ADMIN" || user.role === "MANAGER";
}
