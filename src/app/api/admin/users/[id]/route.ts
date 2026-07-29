import { authorize } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/inventory";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "WORKER"]).optional(),
  active: z.boolean().optional(),
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
    const user = await prisma.appUser.update({ where: { id }, data });
    await logActivity(prisma, {
      type: "USER_ROLE_CHANGED",
      actorId: auth.user.id,
      details: `Updated access for ${user.email}`,
      metadata: data,
    });
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid access update" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to update user" }, { status: 500 });
  }
}
