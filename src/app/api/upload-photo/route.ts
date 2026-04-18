import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

const MIME_TO_EXT: Record<AllowedMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function isAllowedMimeType(type: string): type is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(type);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("photo") as File;
    const uploaderName = formData.get("uploader_name") as string;
    const uploaderEmail = (formData.get("uploader_email") as string) || null;
    const caption = (formData.get("caption") as string) || null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!uploaderName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File must be under 10MB" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Derive extension from MIME type (server-side), never from file.name
    const ext = MIME_TO_EXT[file.type];
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(fileName, file);

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("photos").getPublicUrl(fileName);

    // Create photo record (pending moderation)
    const { error: insertError } = await supabase.from("photos").insert({
      uploaded_by_name: uploaderName,
      uploaded_by_email: uploaderEmail,
      image_url: publicUrl,
      caption,
      status: "pending" as const,
    });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
