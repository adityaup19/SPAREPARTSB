import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  extractPartFromImage,
  OcrConfigError,
  OcrRequestError,
} from "@/lib/ocr";
import { authorize } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  image: z
    .string()
    .min(1, "An image is required")
    .max(7_000_000, "Image is too large")
    .refine(
      (value) => /^data:image\/(jpeg|png|webp);base64,/i.test(value),
      "Only JPEG, PNG, and WebP images are supported"
    ),
});

export async function POST(request: NextRequest) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "An image is required to analyze." },
      { status: 400 }
    );
  }

  try {
    const day = new Date().toISOString().slice(0, 10);
    const usage = await prisma.scanUsage.upsert({
      where: { userId_day: { userId: auth.user.id, day } },
      create: { userId: auth.user.id, day, count: 1 },
      update: { count: { increment: 1 } },
    });
    const dailyLimit = Math.max(1, Number(process.env.OCR_DAILY_USER_LIMIT || 100));
    if (usage.count > dailyLimit) {
      return NextResponse.json(
        { error: "Daily scan limit reached. Contact an administrator." },
        { status: 429 }
      );
    }
    const data = await extractPartFromImage(parsed.data.image);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof OcrConfigError) {
      // Configuration problem (missing key) — server-side only detail.
      console.error("OCR config error:", error.message);
      return NextResponse.json(
        {
          error:
            "AI extraction is not configured on the server. Please contact an administrator.",
        },
        { status: 503 }
      );
    }
    if (error instanceof OcrRequestError) {
      console.error("OCR request error:", error.message);
      return NextResponse.json(
        {
          error:
            "We couldn't read the label from that image. Try a clearer, well-lit photo or enter the details manually.",
        },
        { status: 502 }
      );
    }
    console.error("Unexpected OCR error:", error);
    return NextResponse.json(
      { error: "Something went wrong while analyzing the image." },
      { status: 500 }
    );
  }
}
