import { authorize } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const cell = (value: unknown) => {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

export async function GET() {
  const auth = await authorize(["ADMIN", "MANAGER"]);
  if (auth.response) return auth.response;
  const activities = await prisma.activity.findMany({
    include: { actor: true, part: true, project: true },
    orderBy: { createdAt: "desc" },
    take: 10_000,
  });
  const rows = [
    ["Timestamp", "User", "Role", "Action", "Details", "Part Number", "Project", "Source"].map(cell).join(","),
    ...activities.map((item) =>
      [
        item.createdAt.toISOString(),
        item.actor?.email || "System",
        item.actor?.role || "",
        item.type,
        item.details,
        item.part?.partNumber,
        item.project?.name,
        item.source,
      ].map(cell).join(",")
    ),
  ];
  return new NextResponse(`\uFEFF${rows.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
