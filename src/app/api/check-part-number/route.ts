import { prisma } from "@/lib/db";
import { computeAvailable } from "@/lib/inventory";
import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  try {
    const searchParams = request.nextUrl.searchParams;
    const partNumber = searchParams.get("partNumber");
    const manufacturer = searchParams.get("manufacturer");
    const modelNumber = searchParams.get("modelNumber");

    if (!partNumber && !(manufacturer && modelNumber)) {
      return NextResponse.json(
        { error: "Provide a part number, or manufacturer and model number" },
        { status: 400 }
      );
    }

    // Primary check: exact part number.
    let part = partNumber
      ? await prisma.part.findFirst({
          where: { partNumber: { equals: partNumber.trim(), mode: "insensitive" } },
        })
      : null;

    let matchType: "partNumber" | "modelNumber" | null = part
      ? "partNumber"
      : null;

    // Secondary check: manufacturer + model number.
    if (!part && manufacturer && modelNumber) {
      part = await prisma.part.findFirst({
        where: {
          manufacturer: { equals: manufacturer.trim(), mode: "insensitive" },
          modelNumber: { equals: modelNumber.trim(), mode: "insensitive" },
        },
      });
      if (part) matchType = "modelNumber";
    }

    if (part) {
      return NextResponse.json({
        exists: true,
        matchType,
        part: {
          ...part,
          availableQuantity: computeAvailable(part),
        },
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error("Error checking part number:", error);
    return NextResponse.json(
      { error: "Failed to check part number" },
      { status: 500 }
    );
  }
}
