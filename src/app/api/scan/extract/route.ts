import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  extractPartFromImage,
  OcrConfigError,
  OcrRequestError,
} from "@/lib/ocr";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  image: z.string().min(1, "An image is required"),
});

export async function POST(request: NextRequest) {
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
