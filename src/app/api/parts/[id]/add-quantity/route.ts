import { logActivity, withSerializableTransaction } from "@/lib/inventory";
import { authorize } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const addQuantitySchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const body = await request.json();
    const { quantity } = addQuantitySchema.parse(body);

    const updatedPart = await withSerializableTransaction(async (tx) => {
      const part = await tx.part.findUnique({ where: { id } });
      if (!part) return null;
      const updated = await tx.part.update({
        where: { id },
        data: { totalQuantity: { increment: quantity } },
      });
      await logActivity(tx, {
        type: "QUANTITY_ADDED",
        details: `Received ${quantity} units of ${part.name}. New total: ${updated.totalQuantity}`,
        partId: part.id,
        actorId: auth.user.id,
        source: "SCAN",
        metadata: { delta: quantity, previousTotal: part.totalQuantity, newTotal: updated.totalQuantity },
      });
      return updated;
    });
    if (!updatedPart) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

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
