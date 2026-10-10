import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getSessionUser } from "@/lib/rides";
import { rateLimit } from "@/lib/rateLimit";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  // Only signed-in users may store files on the server.
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (!rateLimit(`upload:${user.id}`, 40, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json(
        { error: "No images received." },
        { status: 400 }
      );
    }

    if (files.length > 8) {
      return NextResponse.json(
        { error: "Maximum 8 images allowed." },
        { status: 400 }
      );
    }

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "vehicles"
    );

    await mkdir(uploadDir, { recursive: true });

    const urls: string[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.type}` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `${file.name} is larger than 8 MB.` },
          { status: 400 }
        );
      }

      const extension =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
          ? "webp"
          : "jpg";

      const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const filepath = path.join(uploadDir, filename);

      const bytes = await file.arrayBuffer();
      await writeFile(filepath, Buffer.from(bytes));

      urls.push(`/uploads/vehicles/${filename}`);
    }

    return NextResponse.json({ urls });
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      { error: "Unable to upload images." },
      { status: 500 }
    );
  }
}
