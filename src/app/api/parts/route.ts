import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/inventory";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const partSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  partNumber: z.string().trim().min(1, "Part number is required"),
  manufacturer: z.string().trim().min(1, "Manufacturer is required"),
  modelNumber: z.string().trim().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  quantity: z.number().int().min(0),
  location: z.string().min(1, "Location is required"),
  aisle: z.string().optional().nullable(),
  shelf: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  warrantyExpiration: z.string().optional().nullable(),
  condition: z.enum(["New", "Used", "Refurbished", "Damaged"]).default("New"),
  notes: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const condition = searchParams.get("condition") || "";
    const availability = searchParams.get("availability") || "";
    const warranty = searchParams.get("warranty") || "";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") || 50)));

    const where: Prisma.PartWhereInput = {};

    if (search) {
      const mode = "insensitive" as const;
      where.OR = [
        { name: { contains: search, mode } },
        { partNumber: { contains: search, mode } },
        { manufacturer: { contains: search, mode } },
        { modelNumber: { contains: search, mode } },
        { serialNumber: { contains: search, mode } },
        { location: { contains: search, mode } },
        { aisle: { contains: search, mode } },
        { shelf: { contains: search, mode } },
        { bin: { contains: search, mode } },
      ];
    }

    if (condition) {
      where.condition = condition;
    }

    if (availability === "available") {
      where.totalQuantity = { gt: prisma.part.fields.reservedQuantity };
    } else if (availability === "reserved") {
      where.reservedQuantity = { gt: 0 };
    } else if (availability === "out") {
      where.totalQuantity = { lte: prisma.part.fields.reservedQuantity };
    }

    const now = new Date();
    if (warranty === "expiring") {
      where.warrantyExpiration = {
        gt: now,
        lte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      };
    } else if (warranty === "expired") {
      where.warrantyExpiration = { lte: now };
    }

    let parts = await prisma.part.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      omit: { imageUrl: true, notes: true },
    });
    if (availability === "low") {
      parts = parts.filter((p) => {
        const available = p.totalQuantity - p.reservedQuantity;
        return available > 0 && available <= 5;
      });
    }
    const total = await prisma.part.count({ where });
    return NextResponse.json({
      items: parts,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("Error fetching parts:", error);
    return NextResponse.json(
      { error: "Failed to fetch parts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const validatedData = partSchema.parse(body);

    // Duplicate detection: exact part number.
    const existingPart = await prisma.part.findFirst({
      where: {
        OR: [
          {
            partNumber: {
              equals: validatedData.partNumber,
              mode: "insensitive",
            },
          },
          ...(validatedData.modelNumber
            ? [
                {
                  manufacturer: {
                    equals: validatedData.manufacturer,
                    mode: "insensitive" as const,
                  },
                  modelNumber: {
                    equals: validatedData.modelNumber,
                    mode: "insensitive" as const,
                  },
                },
              ]
            : []),
        ],
      },
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
      actorId: auth.user.id,
      source: "WEB",
      metadata: { quantity },
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
