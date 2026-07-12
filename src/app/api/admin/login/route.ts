import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminTokenFor } from "@/lib/admin";
import { rateLimit } from "@/lib/rateLimit";
import { createHash, timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "admin-login", 5, 10 * 60_000);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
  }

  const password = String(body.password ?? "");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return NextResponse.json({ error: "Şifrə yanlışdır" }, { status: 401 });
  }
  const pw = createHash("sha256").update(password).digest();
  const ex = createHash("sha256").update(expected).digest();
  if (pw.length !== ex.length || !timingSafeEqual(pw, ex)) {
    return NextResponse.json({ error: "Şifrə yanlışdır" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminTokenFor(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 saat
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
