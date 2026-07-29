import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth";
import { logActivity } from "@/lib/inventory";

const projectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  status: z.enum(["Active", "Planned", "On Hold", "Completed"]).default("Active"),
});

export async function GET() {
  const auth = await authorize();
  if (auth.response) return auth.response;
  try {
    const projects = await prisma.project.findMany({
      include: {
        reservations: {
          include: {
            part: true,
          },
        },
        _count: {
          select: { reservations: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize(["ADMIN", "MANAGER"]);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const validatedData = projectSchema.parse(body);

    const project = await prisma.project.create({
      data: validatedData,
    });
    await logActivity(prisma, {
      type: "PROJECT_CREATED",
      actorId: auth.user.id,
      projectId: project.id,
      details: `Created project ${project.name}`,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
