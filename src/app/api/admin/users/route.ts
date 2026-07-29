import { authorize } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/inventory";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(100).optional(),
  role: z.enum(["ADMIN", "MANAGER", "WORKER"]),
});

export async function GET() {
  const auth = await authorize(["ADMIN"]);
  if (auth.response) return auth.response;
  const users = await prisma.appUser.findMany({ orderBy: { email: "asc" } });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const auth = await authorize(["ADMIN"]);
  if (auth.response) return auth.response;
  try {
    const data = inviteSchema.parse(await request.json());
    const email = data.email.toLowerCase();
    const supabase = createSupabaseAdminClient();
    const redirectTo = `${request.nextUrl.origin}/auth/callback?next=/auth/reset-password`;
    const { data: invited, error } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: { display_name: data.displayName ?? email.split("@")[0] },
      }
    );
    if (error || !invited.user) {
      return NextResponse.json(
        { error: error?.message ?? "Unable to invite user" },
        { status: 400 }
      );
    }
    const user = await prisma.appUser.upsert({
      where: { id: invited.user.id },
      update: { role: data.role, active: true, displayName: data.displayName },
      create: {
        id: invited.user.id,
        email,
        displayName: data.displayName ?? email.split("@")[0],
        role: data.role,
      },
    });
    await logActivity(prisma, {
      type: "USER_INVITED",
      actorId: auth.user.id,
      details: `Invited ${email} as ${data.role}`,
      metadata: { invitedUserId: user.id, role: data.role },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid invitation", details: error.errors }, { status: 400 });
    }
    console.error("User invitation failed:", error);
    return NextResponse.json({ error: "User invitation failed" }, { status: 500 });
  }
}
