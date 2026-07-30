import { authorize } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/inventory";
import { logger } from "@/lib/logger";
import { invitationRedirectUrl } from "@/lib/invitations";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(100).optional(),
  role: z.enum(["ADMIN", "MANAGER", "WORKER"]),
});

/** Locates an existing Supabase identity so a stale sign-in cannot block onboarding. */
async function findIdentityByEmail(supabase: SupabaseClient, email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) return null;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

export async function GET() {
  const auth = await authorize(["ADMIN"]);
  if (auth.response) return auth.response;
  const users = await prisma.appUser.findMany({
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const auth = await authorize(["ADMIN"]);
  if (auth.response) return auth.response;
  try {
    const data = inviteSchema.parse(await request.json());
    const email = data.email.toLowerCase();
    const displayName = data.displayName ?? email.split("@")[0];
    const supabase = createSupabaseAdminClient();
    const redirectTo = invitationRedirectUrl(request.nextUrl.origin);

    const invite = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { display_name: displayName },
    });

    let identityId = invite.data.user?.id;
    let reused = false;
    if (!identityId) {
      const existing = await findIdentityByEmail(supabase, email);
      if (!existing) {
        return NextResponse.json(
          { error: invite.error?.message ?? "Unable to invite user" },
          { status: 400 }
        );
      }
      identityId = existing.id;
      reused = true;
    }

    const user = await prisma.appUser.upsert({
      where: { id: identityId },
      update: { email, role: data.role, active: true, displayName },
      create: { id: identityId, email, displayName, role: data.role },
    });
    await logActivity(prisma, {
      type: "USER_INVITED",
      actorId: auth.user.id,
      details: `${reused ? "Granted access to" : "Invited"} ${email} as ${data.role}`,
      metadata: { targetUserId: user.id, targetEmail: email, role: data.role, reused },
    });
    return NextResponse.json({ user, reused }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid invitation", details: error.errors },
        { status: 400 }
      );
    }
    logger.error("User invitation failed", error);
    return NextResponse.json({ error: "User invitation failed" }, { status: 500 });
  }
}
