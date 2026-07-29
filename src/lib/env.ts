import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  OPENAI_API_KEY: z.string().min(20),
  ADMIN_EMAILS: z.string().min(3),
  OCR_DAILY_USER_LIMIT: z.coerce.number().int().positive().default(100),
});

export function validateServerEnvironment() {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      `Missing or invalid server configuration: ${result.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`
    );
  }
  return result.data;
}
