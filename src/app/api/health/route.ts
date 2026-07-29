import { authorize } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { validateServerEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await authorize(["ADMIN"]);
  if (auth.response) return auth.response;
  const started = Date.now();
  try {
    validateServerEnvironment();
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        database: "connected",
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
        responseMs: Date.now() - started,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
