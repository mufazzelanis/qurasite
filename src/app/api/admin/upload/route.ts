import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { apiAdmin } from "@/lib/session";

/**
 * Image upload → /public/uploads. Works on a VPS / local server.
 * On Vercel (read-only disk) use an image URL (Cloudinary, ImgBB, S3...) instead.
 */
export async function POST(req: Request) {
  // images are uploaded from product, category, page, landing and site editors
  const g = await apiAdmin([
    ["products", "create"],
    ["products", "edit"],
    ["landing", "create"],
    ["landing", "edit"],
    ["mainsite", "edit"],
    ["marketing", "edit"],
  ]);
  if (g.error) return g.error;
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!/^image\/(png|jpe?g|webp|avif|gif)$/.test(file.type)) return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Max 5MB" }, { status: 400 });

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/${name}` });
}
