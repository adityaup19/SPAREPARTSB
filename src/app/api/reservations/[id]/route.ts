import { prisma } from "@/lib/db";
import {
  ACTIVE_RESERVATION_STATUSES,
  activityTypeForStatus,
  logActivity,
  recomputeReservedQuantity,
  RESERVATION_STATUSES,
  totalQuantityDeltaForTransition,
} from "@/lib/inventory";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateReservationSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  status: z.enum(RESERVATION_STATUSES).optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { part: true, project: true },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Error fetching reservation:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservation" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateReservationSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.reservation.findUnique({
        where: { id },
        include: { part: true, project: true },
      });

      if (!existing) {
        return { error: "Reservation not found", status: 404 } as const;
      }

      const part = existing.part;

      // Validate quantity change against availability.
      if (validatedData.quantity !== undefined) {
        const wasActive = ACTIVE_RESERVATION_STATUSES.includes(
          existing.status as (typeof ACTIVE_RESERVATION_STATUSES)[number]
        );
        const otherReserved =
          part.reservedQuantity - (wasActive ? existing.quantity : 0);
        const availableForThis = part.totalQuantity - otherReserved;
        if (validatedData.quantity > availableForThis) {
          return {
            error: "Insufficient quantity",
            message: `Only ${availableForThis} units available`,
            availableQuantity: availableForThis,
            status: 400,
          } as const;
        }
      }

      const newStatus = validatedData.status ?? existing.status;
      const newQuantity = validatedData.quantity ?? existing.quantity;

      // Physical stock side effects on status transition (pickup/return).
      const totalDelta = totalQuantityDeltaForTransition(
        existing.status,
        newStatus,
        newQuantity
      );

      const reservation = await tx.reservation.update({
        where: { id },
        data: {
          quantity: newQuantity,
          status: newStatus,
          notes:
            validatedData.notes !== undefined
              ? validatedData.notes
              : existing.notes,
        },
        include: { part: true, project: true },
      });

      if (totalDelta !== 0) {
        await tx.part.update({
          where: { id: part.id },
          data: { totalQuantity: { increment: totalDelta } },
        });
      }

      await recomputeReservedQuantity(tx, part.id);

      const type = validatedData.status
        ? activityTypeForStatus(newStatus)
        : "RESERVATION_UPDATED";

      const details = validatedData.status
        ? `${reservation.quantity} ${part.name} - ${newStatus} for ${existing.project.name}`
        : `Updated reservation for ${part.name}`;

      await logActivity(tx, {
        type,
        details,
        partId: part.id,
        projectId: existing.projectId,
      });

      return { reservation };
    });

    if ("error" in result) {
      const { status, ...rest } = result;
      return NextResponse.json(rest, { status });
    }

    return NextResponse.json(result.reservation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating reservation:", error);
    return NextResponse.json(
      { error: "Failed to update reservation" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id },
        include: { part: true, project: true },
      });

      if (!reservation) {
        return { error: "Reservation not found", status: 404 } as const;
      }

      await tx.reservation.delete({ where: { id } });
      await recomputeReservedQuantity(tx, reservation.partId);

      await logActivity(tx, {
        type: "RESERVATION_CANCELLED",
        details: `Cancelled reservation for ${reservation.quantity} ${reservation.part.name}`,
        partId: reservation.partId,
        projectId: reservation.projectId,
      });

      return { ok: true };
    });

    if ("error" in result) {
      const { status, ...rest } = result;
      return NextResponse.json(rest, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reservation:", error);
    return NextResponse.json(
      { error: "Failed to delete reservation" },
      { status: 500 }
    );
  }
}
