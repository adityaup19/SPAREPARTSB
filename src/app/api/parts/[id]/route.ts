import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/inventory";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth";

const updatePartSchema = z.object({
  name: z.string().min(1).optional(),
  partNumber: z.string().min(1).optional(),
  manufacturer: z.string().min(1).optional(),
  modelNumber: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  location: z.string().min(1).optional(),
  aisle: z.string().optional().nullable(),
  shelf: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  warrantyExpiration: z.string().optional().nullable(),
  condition: z.string().optional(),
  notes: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const part = await prisma.part.findUnique({
      where: { id },
      include: {
        reservations: {
          include: {
            project: true,
          },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 15,
        },
      },
    });

    if (!part) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    return NextResponse.json(part);
  } catch (error) {
    console.error("Error fetching part:", error);
    return NextResponse.json(
      { error: "Failed to fetch part" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize(["ADMIN", "MANAGER"]);
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updatePartSchema.parse(body);

    const existingPart = await prisma.part.findUnique({
      where: { id },
    });

    if (!existingPart) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    // Check for duplicate part number if changing
    if (
      validatedData.partNumber &&
      validatedData.partNumber !== existingPart.partNumber
    ) {
      const duplicate = await prisma.part.findUnique({
        where: { partNumber: validatedData.partNumber },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Part number already exists" },
          { status: 409 }
        );
      }
    }

    const part = await prisma.part.update({
      where: { id },
      data: {
        ...validatedData,
        warrantyExpiration: validatedData.warrantyExpiration
          ? new Date(validatedData.warrantyExpiration)
          : validatedData.warrantyExpiration === null
          ? null
          : undefined,
      },
    });

    await logActivity(prisma, {
      type: "PART_UPDATED",
      details: `Updated ${part.name}`,
      partId: part.id,
      actorId: auth.user.id,
      metadata: { fields: Object.keys(validatedData) },
    });

    return NextResponse.json(part);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating part:", error);
    return NextResponse.json(
      { error: "Failed to update part" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize(["ADMIN"]);
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const part = await prisma.part.findUnique({
      where: { id },
    });

    if (!part) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await logActivity(tx, {
        type: "PART_DELETED",
        details: `Deleted ${part.name} (${part.partNumber})`,
        partId: part.id,
        actorId: auth.user.id,
        metadata: { partNumber: part.partNumber, totalQuantity: part.totalQuantity },
      });
      await tx.part.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting part:", error);
    return NextResponse.json(
      { error: "Failed to delete part" },
      { status: 500 }
    );
  }
}
