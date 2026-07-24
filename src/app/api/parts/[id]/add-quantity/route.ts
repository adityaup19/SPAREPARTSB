import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/inventory";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const addQuantitySchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { quantity } = addQuantitySchema.parse(body);

    const part = await prisma.part.findUnique({
      where: { id },
    });

    if (!part) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    const updatedPart = await prisma.part.update({
      where: { id },
      data: {
        totalQuantity: part.totalQuantity + quantity,
      },
    });

    await logActivity(prisma, {
      type: "QUANTITY_ADDED",
      details: `Added ${quantity} units to ${part.name}. New total: ${updatedPart.totalQuantity}`,
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
    console.error("Error adding quantity:", error);
    return NextResponse.json(
      { error: "Failed to add quantity" },
      { status: 500 }
    );
  }
}
