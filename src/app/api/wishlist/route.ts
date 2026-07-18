import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Seçilmişlər hesaba bağlıdır. Giriş yoxdursa boş siyahı qaytarılır —
// klient bu halda localStorage-a düşür (anonim istifadəçi).
export async function GET(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!me) return NextResponse.json({ authed: false, ids: [] as string[] });
  const rows = await prisma.wishlist.findMany({
    where: { userId: me.id },
    select: { listingId: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ authed: true, ids: rows.map((r) => r.listingId) });
}

// Əlavə et — tək {listingId} və ya login zamanı birləşmə üçün {listingIds:[...]}
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "wishlist-write", 60, 60_000);
  if (limited) return limited;

  const me = await getSessionUser(req);
  if (!me) return NextResponse.json({ error: "Daxil olun" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
  }

  const raw = Array.isArray(body.listingIds)
    ? (body.listingIds as unknown[]).map(String)
    : typeof body.listingId === "string"
    ? [body.listingId]
    : [];
  const ids = Array.from(
    new Set(raw.map((s) => s.trim()).filter(Boolean))
  ).slice(0, 200);
  if (ids.length === 0) {
    return NextResponse.json({ error: "listingId tələb olunur" }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((listingId) =>
      prisma.wishlist.upsert({
        where: { userId_listingId: { userId: me.id, listingId } },
        create: { userId: me.id, listingId },
        update: {},
      })
    )
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}

// Sil
export async function DELETE(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!me) return NextResponse.json({ error: "Daxil olun" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
  }
  const listingId =
    typeof body.listingId === "string" ? body.listingId.trim() : "";
  if (!listingId) {
    return NextResponse.json({ error: "listingId tələb olunur" }, { status: 400 });
  }
  await prisma.wishlist.deleteMany({ where: { userId: me.id, listingId } });
  return NextResponse.json({ ok: true });
}
