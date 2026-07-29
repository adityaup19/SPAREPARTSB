import { authorize } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity, withSerializableTransaction } from "@/lib/inventory";
import { parseCsv } from "@/lib/csv";
import { readSheet, type CellValue } from "read-excel-file/node";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type ImportRow = {
  row: number;
  name: string;
  partNumber: string;
  manufacturer: string;
  modelNumber: string | null;
  quantity: number;
  location: string;
  aisle: string | null;
  shelf: string | null;
  bin: string | null;
  condition: string;
  notes: string | null;
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

async function readRows(file: File): Promise<string[][]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv") {
    return parseCsv(buffer.toString("utf8").replace(/^\uFEFF/, ""));
  }
  const rows = await readSheet(buffer);
  return rows.map((row) =>
    row.map((value: CellValue | null) =>
      value instanceof Date ? value.toISOString() : String(value ?? "")
    )
  );
}

function valueOf(row: string[], headers: Map<string, number>, aliases: string[]) {
  for (const alias of aliases) {
    const column = headers.get(normalize(alias));
    if (column !== undefined) return (row[column] ?? "").trim();
  }
  return "";
}

async function parseFile(file: File) {
  if (file.size > 10 * 1024 * 1024) throw new Error("File must be smaller than 10 MB");
  const sheet = await readRows(file);
  if (!sheet.length) throw new Error("The workbook has no rows");
  const headers = new Map<string, number>();
  sheet[0].forEach((cell, column) => headers.set(normalize(cell), column));
  const rows: ImportRow[] = [];
  const errors: { row: number; error: string }[] = [];
  const seen = new Map<string, ImportRow>();

  sheet.slice(1, 2001).forEach((row, index) => {
    const rowNumber = index + 2;
    const partNumber = valueOf(row, headers, ["Part No.", "Part Number", "SKU"]);
    const name = valueOf(row, headers, ["Description", "Part Name", "Name"]);
    const qtyText = valueOf(row, headers, ["Qty", "Quantity", "Total Quantity"]);
    const quantity = Number(qtyText || 0);
    if (!partNumber && !name) return;
    if (!partNumber || !name || !Number.isInteger(quantity) || quantity < 0) {
      errors.push({
        row: rowNumber,
        error: "Part number, name/description, and a non-negative whole quantity are required",
      });
      return;
    }
    const item: ImportRow = {
      row: rowNumber,
      name: name.slice(0, 200),
      partNumber: partNumber.slice(0, 100),
      manufacturer:
        valueOf(row, headers, ["Manufacturer", "Brand"]) || "Johnson Controls",
      modelNumber: valueOf(row, headers, ["Model Number", "Model", "PID"]) || null,
      quantity,
      location: valueOf(row, headers, ["Warehouse", "Location"]) || "Main Warehouse",
      aisle: valueOf(row, headers, ["Aisle", "Row"]) || null,
      shelf: valueOf(row, headers, ["Shelf"]) || null,
      bin: valueOf(row, headers, ["Bin", "Level"]) || null,
      condition: valueOf(row, headers, ["Condition"]) || "New",
      notes: valueOf(row, headers, ["Notes"]) || null,
    };
    const duplicate = seen.get(item.partNumber);
    if (duplicate) duplicate.quantity += item.quantity;
    else {
      seen.set(item.partNumber, item);
      rows.push(item);
    }
  });
  return { rows, errors };
}

export async function POST(request: NextRequest) {
  const auth = await authorize(["ADMIN", "MANAGER"]);
  if (auth.response) return auth.response;
  try {
    const form = await request.formData();
    const file = form.get("file");
    const mode = form.get("mode") === "import" ? "import" : "preview";
    const strategy = String(form.get("strategy") || "merge");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an Excel or CSV file" }, { status: 400 });
    }
    const parsed = await parseFile(file);
    const existing = await prisma.part.findMany({
      where: { partNumber: { in: parsed.rows.map((row) => row.partNumber) } },
      select: { partNumber: true },
    });
    const existingNumbers = new Set(existing.map((part) => part.partNumber));
    const summary = {
      valid: parsed.rows.length,
      invalid: parsed.errors.length,
      newParts: parsed.rows.filter((row) => !existingNumbers.has(row.partNumber)).length,
      existingParts: parsed.rows.filter((row) => existingNumbers.has(row.partNumber)).length,
    };
    if (mode === "preview") {
      return NextResponse.json({
        summary,
        rows: parsed.rows.slice(0, 100),
        errors: parsed.errors.slice(0, 100),
      });
    }
    if (!["skip", "merge", "replace"].includes(strategy)) {
      return NextResponse.json({ error: "Invalid duplicate strategy" }, { status: 400 });
    }

    const result = await withSerializableTransaction(async (tx) => {
      let created = 0;
      let updated = 0;
      for (const row of parsed.rows) {
        const found = await tx.part.findUnique({ where: { partNumber: row.partNumber } });
        const data = {
          name: row.name,
          manufacturer: row.manufacturer,
          modelNumber: row.modelNumber,
          location: row.location,
          aisle: row.aisle,
          shelf: row.shelf,
          bin: row.bin,
          condition: row.condition,
          notes: row.notes,
        };
        if (!found) {
          await tx.part.create({
            data: { ...data, partNumber: row.partNumber, totalQuantity: row.quantity },
          });
          created++;
        } else if (strategy !== "skip") {
          await tx.part.update({
            where: { id: found.id },
            data: {
              ...data,
              totalQuantity:
                strategy === "merge"
                  ? { increment: row.quantity }
                  : Math.max(row.quantity, found.reservedQuantity),
            },
          });
          updated++;
        }
      }
      await logActivity(tx, {
        type: "INVENTORY_IMPORTED",
        actorId: auth.user.id,
        source: "IMPORT",
        details: `Imported ${created} new and updated ${updated} existing parts from ${file.name}`,
        metadata: { fileName: file.name, strategy, created, updated, rejected: parsed.errors.length },
      });
      return { created, updated };
    });
    return NextResponse.json({ ...summary, ...result, rejected: parsed.errors.length });
  } catch (error) {
    console.error("Inventory import failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Inventory import failed" },
      { status: 400 }
    );
  }
}
