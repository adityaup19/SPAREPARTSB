import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/inventory";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const partSchema = z.object({
  name: z.string().min(1, "Name is required"),
  partNumber: z.string().min(1, "Part number is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  modelNumber: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  quantity: z.number().int().min(0),
  location: z.string().min(1, "Location is required"),
  aisle: z.string().optional().nullable(),
  shelf: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  warrantyExpiration: z.string().optional().nullable(),
  condition: z.string().default("New"),
  notes: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const condition = searchParams.get("condition") || "";
    const availability = searchParams.get("availability") || "";
    const warranty = searchParams.get("warranty") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { partNumber: { contains: search } },
        { manufacturer: { contains: search } },
        { modelNumber: { contains: search } },
        { serialNumber: { contains: search } },
        { location: { contains: search } },
        { aisle: { contains: search } },
        { shelf: { contains: search } },
        { bin: { contains: search } },
      ];
    }

    if (condition) {
      where.condition = condition;
    }

    let parts = await prisma.part.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    // Availability filters computed in-memory (available = total - reserved).
    if (availability === "available") {
      parts = parts.filter((p) => p.totalQuantity - p.reservedQuantity > 0);
    } else if (availability === "reserved") {
      parts = parts.filter((p) => p.reservedQuantity > 0);
    } else if (availability === "low") {
      parts = parts.filter((p) => {
        const available = p.totalQuantity - p.reservedQuantity;
        return available > 0 && available <= 5;
      });
    } else if (availability === "out") {
      parts = parts.filter((p) => p.totalQuantity - p.reservedQuantity <= 0);
    }

    if (warranty === "expiring") {
      const now = Date.now();
      const soon = now + 90 * 24 * 60 * 60 * 1000;
      parts = parts.filter((p) => {
        if (!p.warrantyExpiration) return false;
        const t = new Date(p.warrantyExpiration).getTime();
        return t > now && t <= soon;
      });
    } else if (warranty === "expired") {
      const now = Date.now();
      parts = parts.filter((p) => {
        if (!p.warrantyExpiration) return false;
        return new Date(p.warrantyExpiration).getTime() <= now;
      });
    }

    return NextResponse.json(parts);
  } catch (error) {
    console.error("Error fetching parts:", error);
    return NextResponse.json(
      { error: "Failed to fetch parts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = partSchema.parse(body);

    // Duplicate detection: exact part number.
    const existingPart = await prisma.part.findUnique({
      where: { partNumber: validatedData.partNumber },
    });

    if (existingPart) {
      return NextResponse.json(
        {
          error: "Part number already exists",
          existingPart,
        },
        { status: 409 }
      );
    }

    const { quantity, ...rest } = validatedData;

    const part = await prisma.part.create({
      data: {
        ...rest,
        totalQuantity: quantity,
        reservedQuantity: 0,
        warrantyExpiration: validatedData.warrantyExpiration
          ? new Date(validatedData.warrantyExpiration)
          : null,
      },
    });

    await logActivity(prisma, {
      type: "PART_CREATED",
      details: `Added ${quantity} units of ${validatedData.name}`,
      partId: part.id,
    });

    return NextResponse.json(part, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating part:", error);
    return NextResponse.json(
      { error: "Failed to create part" },
      { status: 500 }
    );
  }
}
