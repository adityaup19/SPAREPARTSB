import { prisma } from "@/lib/db";
import { seedDatabase } from "@/lib/seed-data";
import { NextResponse } from "next/server";

// Always run at request time on the Node.js runtime (Prisma needs Node, not Edge).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Resets the demo to its pristine state (316 parts / 4,213 units, hero part at
 * 12/3/9). Safe to expose for a demo: the only thing it can ever do is restore
 * the intended sample data. Called by the in-app "Reset demo data" button.
 */
async function reset() {
  try {
    const result = await seedDatabase(prisma);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Demo reset failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to reset demo data" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return reset();
}

// GET is allowed too so the reset can be triggered from a simple bookmark/URL.
export async function GET() {
  return reset();
}
