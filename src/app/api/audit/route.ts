import { authorize } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await authorize(["ADMIN", "MANAGER"]);
  if (auth.response) return auth.response;
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
  const pageSize = 50;
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const where = search
    ? {
        OR: [
          { details: { contains: search, mode: "insensitive" as const } },
          { actor: { email: { contains: search, mode: "insensitive" as const } } },
          { part: { partNumber: { contains: search, mode: "insensitive" as const } } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        actor: { select: { email: true, displayName: true, role: true } },
        part: { select: { id: true, name: true, partNumber: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.activity.count({ where }),
  ]);
  return NextResponse.json({
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
