import { authorize } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/inventory";
import { NextRequest, NextResponse } from "next/server";

function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const auth = await authorize(["ADMIN", "MANAGER"]);
  if (auth.response) return auth.response;
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const parts = await prisma.part.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { partNumber: { contains: search, mode: "insensitive" } },
            { manufacturer: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { partNumber: "asc" },
  });
  const headers = [
    "Part Name",
    "Part Number",
    "Manufacturer",
    "Model Number",
    "Total Quantity",
    "Reserved Quantity",
    "Available Quantity",
    "Location",
    "Aisle",
    "Shelf",
    "Bin",
    "Condition",
    "Warranty Expiration",
    "Notes",
  ];
  const lines = [
    headers.map(csvCell).join(","),
    ...parts.map((part) =>
      [
        part.name,
        part.partNumber,
        part.manufacturer,
        part.modelNumber,
        part.totalQuantity,
        part.reservedQuantity,
        part.totalQuantity - part.reservedQuantity,
        part.location,
        part.aisle,
        part.shelf,
        part.bin,
        part.condition,
        part.warrantyExpiration?.toISOString().slice(0, 10),
        part.notes,
      ]
        .map(csvCell)
        .join(",")
    ),
  ];
  await logActivity(prisma, {
    type: "INVENTORY_EXPORTED",
    actorId: auth.user.id,
    details: `Exported ${parts.length} inventory records`,
    metadata: { search: search || null, count: parts.length },
  });
  return new NextResponse(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
