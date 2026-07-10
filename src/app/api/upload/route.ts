import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Magic-byte yoxlaması — yalnız client-in göndərdiyi Content-Type-a güvənmirik
function hasImageSignature(buf: Buffer, ext: string): boolean {
  if (buf.length < 12) return false;
  if (ext === "jpg") {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (ext === "png") {
    return (
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    );
  }
  if (ext === "webp") {
    return (
      buf.toString("ascii", 0, 4) === "RIFF" &&
      buf.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

// Elan fotolarının yüklənməsi. Sessiya tələb olunur.
// Canlıda Vercel Blob (BLOB_READ_WRITE_TOKEN), lokalda public/uploads.
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Daxil olun" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fayl seçilməyib" }, { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Yalnız JPG, PNG və ya WEBP" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Faylın həcmi 5 MB-dan çox olmamalıdır" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (!hasImageSignature(buf, ext)) {
    return NextResponse.json(
      { error: "Fayl həqiqi şəkil deyil" },
      { status: 400 }
    );
  }

  const name = `${randomUUID()}.${ext}`;

  // Canlı: Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`listings/${name}`, buf, {
      access: "public",
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url });
  }

  // Canlıda Blob token yoxdursa disk yazısı işləməz (read-only FS) — aydın xəta
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Şəkil saxlama konfiqurasiya olunmayıb (BLOB_READ_WRITE_TOKEN lazımdır)" },
      { status: 503 }
    );
  }

  // Lokal / self-host: public/uploads
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return NextResponse.json({ url: `/uploads/${name}` });
}
