import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  isValidEmail,
  makeResetToken,
  verifyResetToken,
} from "@/lib/auth";
import { sendEmail } from "@/lib/notify";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050";

// Bərpa linki göndər (email mövcudluğunu sızdırmamaq üçün cavab həmişə eynidir)
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // boş gövdə
  }
  const email = String(body.email ?? "").trim().toLowerCase();

  if (isValidEmail(email)) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.passwordHash) {
      const token = makeResetToken(user.id, user.passwordHash);
      const link = `${BASE}/parol-yenile?token=${encodeURIComponent(token)}`;
      await sendEmail(
        email,
        "Gecələ — parol bərpası",
        `<p>Parolunuzu yeniləmək üçün aşağıdakı linkə keçin (1 saat etibarlıdır):</p>` +
          `<p><a href="${link}">${link}</a></p>` +
          `<p>Bu sorğunu siz göndərməmisinizsə, məktubu nəzərə almayın.</p>`
      );
    }
  }

  return NextResponse.json({ ok: true });
}

// Yeni parol təyin et
export async function PUT(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // boş gövdə
  }
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Şifrə ən azı 6 simvol olmalıdır" },
      { status: 400 }
    );
  }

  const userId = token.split(".")[0] ?? "";
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null;

  if (!user || !user.passwordHash || verifyResetToken(token, user.passwordHash) !== user.id) {
    return NextResponse.json(
      { error: "Link etibarsız və ya müddəti bitib — yeni link istəyin" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(password) },
  });

  return NextResponse.json({ ok: true });
}
