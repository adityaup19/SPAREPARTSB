import { authorize } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/inventory";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z
  .object({
    role: z.enum(["ADMIN", "MANAGER", "WORKER"]).optional(),
    active: z.boolean().optional(),
    displayName: z.string().trim().min(1).max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide a role, name, or access change",
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize(["ADMIN"]);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (id === auth.user.id) {
    return NextResponse.json(
      { error: "You cannot change your own role or access" },
      { status: 400 }
    );
  }
  try {
    const data = updateSchema.parse(await request.json());
    const target = await prisma.appUser.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = await prisma.appUser.update({ where: { id }, data });
    const changes = [
      data.role && data.role !== target.role ? `role ${target.role} to ${data.role}` : null,
      data.active !== undefined && data.active !== target.active
        ? data.active
          ? "reactivated"
          : "disabled"
        : null,
    ].filter(Boolean);
    await logActivity(prisma, {
      type: "USER_ROLE_CHANGED",
      actorId: auth.user.id,
      details: `Updated ${user.email}${changes.length ? `: ${changes.join(", ")}` : ""}`,
      metadata: {
        targetUserId: user.id,
        targetEmail: user.email,
        from: { role: target.role, active: target.active },
        to: { role: user.role, active: user.active },
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid access update" }, { status: 400 });
    }
    logger.error("User access update failed", error);
    return NextResponse.json({ error: "Unable to update user" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize(["ADMIN"]);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (id === auth.user.id) {
    return NextResponse.json({ error: "You cannot remove your own account" }, { status: 400 });
  }

  const target = await prisma.appUser.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Keep the audit trail attributable after the profile row disappears.
      await tx.$executeRaw`
        UPDATE "Activity"
        SET "metadata" = jsonb_set(
          COALESCE("metadata", '{}'::jsonb),
          '{actorEmail}',
          to_jsonb(${target.email}::text),
          true
        )
        WHERE "actorId" = ${id}
      `;
      await tx.appUser.delete({ where: { id } });
      await logActivity(tx, {
        type: "USER_REMOVED",
        actorId: auth.user.id,
        details: `Removed ${target.email} (${target.role})`,
        metadata: { targetEmail: target.email, role: target.role },
      });
    });
  } catch (error) {
    logger.error("User removal failed", error, { targetId: id });
    return NextResponse.json({ error: "Unable to remove user" }, { status: 500 });
  }

  // Access is already revoked above; a failure here only leaves a dormant login.
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;
  } catch (error) {
    logger.warn("Removed app access but could not delete Supabase identity", {
      targetId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({
      removed: true,
      warning:
        "Access removed. The sign-in identity could not be deleted automatically; delete it in Supabase Authentication.",
    });
  }

  return NextResponse.json({ removed: true });
}
