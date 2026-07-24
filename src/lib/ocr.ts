import OpenAI from "openai";
import { z } from "zod";

/**
 * Server-side part-label extraction using the OpenAI vision API.
 *
 * The OpenAI API key is read from process.env.OPENAI_API_KEY and is never
 * sent to the client. This module must only be imported from server code
 * (API routes / server components).
 */

export const extractedPartSchema = z.object({
  name: z.string().default(""),
  partNumber: z.string().default(""),
  manufacturer: z.string().default(""),
  modelNumber: z.string().default(""),
  serialNumber: z.string().default(""),
  description: z.string().default(""),
  warrantyExpiration: z.string().default(""),
  dateInfo: z.string().default(""),
  visibleText: z.string().default(""),
});

export type ExtractedPart = z.infer<typeof extractedPartSchema>;

export class OcrConfigError extends Error {}
export class OcrRequestError extends Error {}

const MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

const SYSTEM_PROMPT = `You are an expert at reading photographs of industrial spare-part labels and nameplates.
Extract ONLY information that is clearly visible and legible in the image.
Never guess, infer, or invent values. If a field is not clearly readable, return an empty string for it.
Do not translate or reformat identifiers — copy part numbers, model numbers, and serial numbers exactly as printed.
Respond with a single JSON object and nothing else.`;

const USER_PROMPT = `Read this part label / nameplate and return a JSON object with these exact keys:
- "name": short human-readable name of the part/product (empty string if not visible)
- "partNumber": the manufacturer part number / catalog number (empty string if not visible)
- "manufacturer": the maker/brand (empty string if not visible)
- "modelNumber": the model or type designation (empty string if not visible)
- "serialNumber": the serial number (empty string if not visible)
- "description": a brief description built only from text visible on the label (empty string if none)
- "warrantyExpiration": a warranty or expiration date if explicitly shown, normalized to YYYY-MM-DD (empty string if none or ambiguous)
- "dateInfo": any other visible date text exactly as printed (empty string if none)
- "visibleText": all other legible text on the label, joined with " | "
Only include what you can actually read. Return empty strings for anything not clearly visible.`;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OcrConfigError(
      "OpenAI API key is not configured. Add OPENAI_API_KEY to your .env file."
    );
  }
  return new OpenAI({ apiKey });
}

/**
 * Analyze a base64 data-URL image and extract structured part fields.
 * Throws OcrConfigError when the key is missing and OcrRequestError when the
 * request or parsing fails.
 */
export async function extractPartFromImage(
  imageDataUrl: string
): Promise<ExtractedPart> {
  if (!imageDataUrl || !imageDataUrl.startsWith("data:image/")) {
    throw new OcrRequestError("A valid image is required.");
  }

  const client = getClient();

  let content: string | null | undefined;
  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
          ],
        },
      ],
    });
    content = completion.choices[0]?.message?.content;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to contact the vision service.";
    throw new OcrRequestError(message);
  }

  if (!content) {
    throw new OcrRequestError("The vision service returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new OcrRequestError("Could not parse the extraction result.");
  }

  const result = extractedPartSchema.safeParse(parsed);
  if (!result.success) {
    // Be lenient: coerce whatever fields are present, ignore the rest.
    return extractedPartSchema.parse(
      typeof parsed === "object" && parsed !== null ? parsed : {}
    );
  }

  return result.data;
}
