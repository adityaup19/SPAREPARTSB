import { logActivity, withSerializableTransaction } from "@/lib/inventory";
import { authorize } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const adjustSchema = z.object({
  delta: z.number().int().refine((v) => v !== 0, "Delta cannot be zero"),
  reason: z.string().trim().min(3, "An adjustment reason is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize(["ADMIN", "MANAGER"]);
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const body = await request.json();
    const { delta, reason } = adjustSchema.parse(body);

    const result = await withSerializableTransaction(async (tx) => {
      const part = await tx.part.findUnique({ where: { id } });
      if (!part) return { error: "Part not found", status: 404 } as const;
      const newTotal = part.totalQuantity + delta;
      if (newTotal < part.reservedQuantity) {
        return {
          error: `Quantity cannot be below the ${part.reservedQuantity} reserved units`,
          status: 400,
        } as const;
      }
      const updatedPart = await tx.part.update({
        where: { id },
        data: { totalQuantity: { increment: delta } },
      });
      await logActivity(tx, {
        type: delta > 0 ? "QUANTITY_ADDED" : "QUANTITY_REMOVED",
        details: `${delta > 0 ? "Added" : "Removed"} ${Math.abs(delta)} units ${delta > 0 ? "to" : "from"} ${part.name} (${reason})`,
        partId: part.id,
        actorId: auth.user.id,
        metadata: { delta, reason, previousTotal: part.totalQuantity, newTotal },
      });
      return { updatedPart };
    });
    if ("error" in result) {
      const { status, ...body } = result;
      return NextResponse.json(body, { status });
    }
    return NextResponse.json(result.updatedPart);
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
