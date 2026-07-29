import { authorize } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await authorize();
  if (auth.response) return auth.response;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !ALLOWED.has(file.type) || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Upload a JPEG, PNG, or WebP image smaller than 5 MB" },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseAdminClient();
    const bucket = "part-images";
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((item) => item.name === bucket)) {
      const { error } = await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: MAX_BYTES,
        allowedMimeTypes: [...ALLOWED],
      });
      if (error) throw error;
    }
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${auth.user.id}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: false,
      });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    console.error("Part image upload failed:", error);
    return NextResponse.json({ error: "Image upload failed" }, { status: 500 });
  }
}
