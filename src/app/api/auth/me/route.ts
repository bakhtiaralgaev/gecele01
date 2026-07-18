import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearSession, getSessionUser, toUserDto } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  return NextResponse.json({ user: user ? toUserDto(user) : null });
}

// Profil yeniləmə: ad dəyişikliyi və/və ya rol keçidi (qonaq ↔ ev sahibi)
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Daxil olun" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
  }

  const data: { name?: string; role?: string } = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2 || name.length > 40) {
      return NextResponse.json(
        { error: "Ad 2–40 simvol olmalıdır" },
        { status: 400 }
      );
    }
    data.name = name;
  }

  if (body.role !== undefined) {
    if (body.role !== "host" && body.role !== "guest") {
      return NextResponse.json({ error: "Naməlum rol" }, { status: 400 });
    }
    data.role = body.role;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Dəyişiklik yoxdur" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
  });
  return NextResponse.json({ user: toUserDto(updated) });
}

export async function DELETE(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode");
  if (mode === "delete") {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Daxil olun" }, { status: 401 });
    }
    // Hesabı və şəxsi məlumatları sil; əlaqəli qeydlərin sahibliyini boşalt (App Store 5.1.1)
    await prisma.$transaction([
      prisma.booking.updateMany({
        where: { userId: user.id },
        data: { userId: null },
      }),
      prisma.listing.updateMany({
        where: { ownerId: user.id },
        data: { ownerId: null },
      }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);
    const res = NextResponse.json({ ok: true, deleted: true });
    clearSession(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  clearSession(res);
  return res;
}
