import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Files here are NOT under /public, so they can only be read through an authorised API route.
const ROOT = path.join(process.cwd(), "private-uploads");

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const CONTENT_TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function savePrivateImage(folder: string, file: File, maxBytes: number): Promise<string> {
  const extension = EXTENSIONS[file.type];
  if (!extension) throw new Error("Please upload a JPG, PNG or WEBP image.");
  if (file.size > maxBytes) throw new Error(`The image must be smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.`);

  const dir = path.join(ROOT, folder);
  await mkdir(dir, { recursive: true });
  const relative = path.join(folder, `${crypto.randomUUID()}.${extension}`);
  await writeFile(path.join(ROOT, relative), Buffer.from(await file.arrayBuffer()));
  return relative;
}

export async function readPrivateFile(relative: string) {
  const full = path.resolve(ROOT, relative);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid path.");
  const extension = path.extname(full).slice(1).toLowerCase();
  return { data: await readFile(full), contentType: CONTENT_TYPES[extension] ?? "application/octet-stream" };
}
