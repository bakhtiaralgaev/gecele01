import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearSession, getSessionUser, toUserDto } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  return NextResponse.json({ user: user ? toUserDto(user) : null });
}

// Rol yüksəltmə: qonaq hesabı ev sahibi hesabına çevrilir
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
  if (body.role !== "host" && body.role !== "guest") {
    return NextResponse.json({ error: "Naməlum rol" }, { status: 400 });
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: body.role },
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
