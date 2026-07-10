import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  isValidEmail,
  setSession,
  toUserDto,
  verifyPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

// mode: "register" | "login"
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
  }

  const mode = String(body.mode ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "E-mail düzgün deyil" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Şifrə ən azı 6 simvol olmalıdır" },
      { status: 400 }
    );
  }

  if (mode === "register") {
    const name = String(body.name ?? "").trim();
    const role = body.role === "host" ? "host" : "guest";
    if (name.length < 2) {
      return NextResponse.json({ error: "Adınızı yazın" }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Bu e-mail ilə hesab artıq var — daxil olun" },
        { status: 409 }
      );
    }
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        provider: "email",
        passwordHash: hashPassword(password),
      },
    });
    const res = NextResponse.json({ user: toUserDto(user) }, { status: 201 });
    setSession(res, user.id);
    return res;
  }

  if (mode === "login") {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "E-mail və ya şifrə yanlışdır" },
        { status: 401 }
      );
    }
    const res = NextResponse.json({ user: toUserDto(user) });
    setSession(res, user.id);
    return res;
  }

  return NextResponse.json({ error: "Naməlum əməliyyat" }, { status: 400 });
}
