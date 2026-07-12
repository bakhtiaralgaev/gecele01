import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Mesajlaşma yalnız rezervasiyadan sonra: söhbət booking-ə bağlıdır və yalnız
// həmin rezervin qonağı (userId) və ya elanın ev sahibi (ownerId) yaza bilər.
async function resolveParty(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: { select: { ownerId: true, title: true, hostName: true } },
    },
  });
  if (!booking) return { error: 404 as const };
  const isGuest = booking.userId === userId;
  const isHost = booking.listing.ownerId === userId;
  if (!isGuest && !isHost) return { error: 403 as const };
  return { booking, role: (isGuest ? "guest" : "host") as "guest" | "host" };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const me = await getSessionUser(req);
  if (!me) return NextResponse.json({ error: "Daxil olun" }, { status: 401 });

  const r = await resolveParty(params.id, me.id);
  if ("error" in r) {
    return NextResponse.json(
      { error: r.error === 404 ? "Rezervasiya tapılmadı" : "İcazə yoxdur" },
      { status: r.error }
    );
  }

  // Qarşı tərəfin mesajlarını oxunmuş işarələ
  await prisma.message.updateMany({
    where: { bookingId: params.id, sender: { not: r.role }, readAt: null },
    data: { readAt: new Date() },
  });

  const messages = await prisma.message.findMany({
    where: { bookingId: params.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json({
    role: r.role,
    title: r.booking.listing.title,
    otherName: r.role === "guest" ? r.booking.listing.hostName : r.booking.guestName,
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      body: m.body,
      mine: m.sender === r.role,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = rateLimit(req, "message-send", 30, 60_000);
  if (limited) return limited;

  const me = await getSessionUser(req);
  if (!me) return NextResponse.json({ error: "Daxil olun" }, { status: 401 });

  const r = await resolveParty(params.id, me.id);
  if ("error" in r) {
    return NextResponse.json(
      { error: r.error === 404 ? "Rezervasiya tapılmadı" : "İcazə yoxdur" },
      { status: r.error }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
  }
  const text = String(body.body ?? "").trim();
  if (text.length < 1 || text.length > 2000) {
    return NextResponse.json(
      { error: "Mesaj 1–2000 simvol olmalıdır" },
      { status: 400 }
    );
  }

  const msg = await prisma.message.create({
    data: { bookingId: params.id, sender: r.role, body: text },
  });

  return NextResponse.json(
    {
      id: msg.id,
      sender: msg.sender,
      body: msg.body,
      mine: true,
      createdAt: msg.createdAt.toISOString(),
    },
    { status: 201 }
  );
}
