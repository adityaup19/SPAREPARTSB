import { prisma } from "@/lib/db";
import { formatLocation, logActivity } from "@/lib/inventory";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth";

const moveSchema = z.object({
  location: z.string().min(1, "Location is required"),
  aisle: z.string().optional().nullable(),
  shelf: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
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
    const data = moveSchema.parse(body);

    const part = await prisma.part.findUnique({ where: { id } });

    if (!part) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    const updatedPart = await prisma.part.update({
      where: { id },
      data: {
        location: data.location,
        aisle: data.aisle ?? null,
        shelf: data.shelf ?? null,
        bin: data.bin ?? null,
      },
    });

    await logActivity(prisma, {
      type: "PART_MOVED",
      details: `Moved ${part.name} to ${formatLocation(updatedPart)}`,
      partId: part.id,
      actorId: auth.user.id,
      metadata: {
        from: formatLocation(part),
        to: formatLocation(updatedPart),
      },
    });

    return NextResponse.json(updatedPart);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error moving part:", error);
    return NextResponse.json(
      { error: "Failed to move part" },
      { status: 500 }
    );
  }
}
