import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/inventory";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const adjustSchema = z.object({
  delta: z.number().int().refine((v) => v !== 0, "Delta cannot be zero"),
  reason: z.string().optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { delta, reason } = adjustSchema.parse(body);

    const part = await prisma.part.findUnique({ where: { id } });

    if (!part) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    const newTotal = part.totalQuantity + delta;

    if (newTotal < 0) {
      return NextResponse.json(
        { error: "Total quantity cannot go below zero" },
        { status: 400 }
      );
    }

    if (newTotal < part.reservedQuantity) {
      return NextResponse.json(
        {
          error: `Cannot remove below reserved quantity (${part.reservedQuantity} reserved)`,
        },
        { status: 400 }
      );
    }

    const updatedPart = await prisma.part.update({
      where: { id },
      data: { totalQuantity: newTotal },
    });

    const reasonSuffix = reason ? ` (${reason})` : "";
    await logActivity(prisma, {
      type: delta > 0 ? "QUANTITY_ADDED" : "QUANTITY_REMOVED",
      details:
        delta > 0
          ? `Added ${delta} units to ${part.name}. New total: ${newTotal}${reasonSuffix}`
          : `Removed ${Math.abs(delta)} units from ${part.name}. New total: ${newTotal}${reasonSuffix}`,
      partId: part.id,
    });

    return NextResponse.json(updatedPart);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error adjusting quantity:", error);
    return NextResponse.json(
      { error: "Failed to adjust quantity" },
      { status: 500 }
    );
  }
}
