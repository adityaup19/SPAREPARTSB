import { prisma } from "@/lib/db";
import {
  computeAvailable,
  logActivity,
  recomputeReservedQuantity,
  withSerializableTransaction,
} from "@/lib/inventory";
import { authorize } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reservationSchema = z.object({
  partId: z.string().min(1, "Part is required"),
  projectId: z.string().min(1, "Project is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const auth = await authorize();
  if (auth.response) return auth.response;
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        part: true,
        project: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize(["ADMIN", "MANAGER"]);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const validatedData = reservationSchema.parse(body);

    const result = await withSerializableTransaction(async (tx) => {
      const part = await tx.part.findUnique({
        where: { id: validatedData.partId },
      });

      if (!part) {
        return { error: "Part not found", status: 404 } as const;
      }

      const project = await tx.project.findUnique({
        where: { id: validatedData.projectId },
      });

      if (!project) {
        return { error: "Project not found", status: 404 } as const;
      }

      const availableQuantity = computeAvailable(part);

      if (validatedData.quantity > availableQuantity) {
        return {
          error: "Insufficient quantity",
          message: `Only ${availableQuantity} units available for reservation`,
          availableQuantity,
          status: 400,
        } as const;
      }

      const reservation = await tx.reservation.create({
        data: {
          partId: validatedData.partId,
          projectId: validatedData.projectId,
          quantity: validatedData.quantity,
          notes: validatedData.notes ?? null,
          status: "Reserved",
        },
        include: { part: true, project: true },
      });

      await recomputeReservedQuantity(tx, part.id);

      await logActivity(tx, {
        type: "RESERVATION_CREATED",
        details: `Reserved ${validatedData.quantity} ${part.name} for ${project.name}`,
        partId: part.id,
        projectId: project.id,
        actorId: auth.user.id,
        metadata: { quantity: validatedData.quantity },
      });

      return { reservation };
    });

    if ("error" in result) {
      const { status, ...rest } = result;
      return NextResponse.json(rest, { status });
    }

    return NextResponse.json(result.reservation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}
