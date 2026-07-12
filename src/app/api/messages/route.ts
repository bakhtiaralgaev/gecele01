import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Söhbətlər qutusu (inbox): sessiya sahibinin qonaq VƏ YA ev sahibi olduğu
// bütün rezervlər. Yalnız rezervasiyadan sonra söhbət mövcud olur.
export async function GET(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!me) return NextResponse.json({ error: "Daxil olun" }, { status: 401 });

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [{ userId: me.id }, { listing: { ownerId: me.id } }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      listing: { select: { title: true, photo: true, hostName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const convos = await Promise.all(
    bookings.map(async (b) => {
      const myRole = b.userId === me.id ? "guest" : "host";
      const unread = await prisma.message.count({
        where: { bookingId: b.id, sender: { not: myRole }, readAt: null },
      });
      const last = b.messages[0];
      return {
        bookingId: b.id,
        title: b.listing.title,
        photo: b.listing.photo,
        otherName: myRole === "guest" ? b.listing.hostName : b.guestName,
        role: myRole,
        lastBody: last?.body ?? null,
        lastAt: last?.createdAt.toISOString() ?? null,
        unread,
      };
    })
  );

  // Ən son mesajlı söhbətlər yuxarıda; boş söhbətlər (hələ mesaj yoxdur) aşağıda
  convos.sort((a, b) => {
    if (!a.lastAt && !b.lastAt) return 0;
    if (!a.lastAt) return 1;
    if (!b.lastAt) return -1;
    return a.lastAt < b.lastAt ? 1 : -1;
  });

  const totalUnread = convos.reduce((n, c) => n + c.unread, 0);
  return NextResponse.json({ conversations: convos, totalUnread });
}
