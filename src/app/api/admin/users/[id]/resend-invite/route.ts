import { authorize } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invitationRedirectUrl } from "@/lib/invitations";
import { logger } from "@/lib/logger";
import {
  createSupabaseAdminClient,
  createSupabaseAuthClient,
} from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Sends a fresh password-setup link when an invitation expired or was lost.
 *
 * Supabase refuses a second invite for an identity that already exists, so an
 * existing identity is emailed a recovery link instead. Both land on
 * /auth/set-password.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize(["ADMIN"]);
  if (auth.response) return auth.response;
  const { id } = await params;

  const target = await prisma.appUser.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!target.active) {
    return NextResponse.json(
      { error: "Reactivate this user before resending their invitation" },
      { status: 400 }
    );
  }

  const redirectTo = invitationRedirectUrl(request.nextUrl.origin);

  try {
    const admin = createSupabaseAdminClient();
    const { data: identity } = await admin.auth.admin.getUserById(id);

    if (!identity?.user) {
      // A profile whose sign-in was deleted outside the app cannot be re-linked,
      // because a new invitation would create a different identity.
      return NextResponse.json(
        {
          error: `${target.email} no longer has a sign-in. Remove the user, then invite them again.`,
        },
        { status: 409 }
      );
    }

    const { error } = await createSupabaseAuthClient().auth.resetPasswordForEmail(
      target.email,
      { redirectTo }
    );
    if (error) throw error;
    return NextResponse.json({
      message: `A new password link was emailed to ${target.email}.`,
    });
  } catch (error) {
    logger.error("Invitation resend failed", error, { targetId: id });
    return NextResponse.json(
      { error: "Unable to resend the invitation. Try again shortly." },
      { status: 502 }
    );
  }
}
