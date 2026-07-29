import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppUser, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

const ALL_ROLES: UserRole[] = ["ADMIN", "MANAGER", "WORKER"];

function adminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function getCurrentUser(): Promise<AppUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();
    if (error || !authUser?.email) return null;

    const email = authUser.email.toLowerCase();
    const role: UserRole = adminEmails().has(email) ? "ADMIN" : "WORKER";
    const user = await prisma.appUser.upsert({
      where: { id: authUser.id },
      update: {
        email,
        displayName:
          authUser.user_metadata?.full_name ??
          authUser.user_metadata?.display_name ??
          undefined,
      },
      create: {
        id: authUser.id,
        email,
        displayName:
          authUser.user_metadata?.full_name ??
          authUser.user_metadata?.display_name ??
          email.split("@")[0],
        role,
      },
    });
    return user.active ? user : null;
  } catch {
    return null;
  }
}

export async function authorize(
  allowed: UserRole[] = ALL_ROLES
): Promise<{ user: AppUser; response?: never } | { user?: never; response: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
  if (!allowed.includes(user.role)) {
    return {
      response: NextResponse.json(
        { error: "You do not have permission to perform this action" },
        { status: 403 }
      ),
    };
  }
  return { user };
}

export function canManage(user: Pick<AppUser, "role">) {
  return user.role === "ADMIN" || user.role === "MANAGER";
}
