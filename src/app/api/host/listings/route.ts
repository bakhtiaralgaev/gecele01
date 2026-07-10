import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Ev sahibinin öz elanları (bütün statuslar) + təsdiqlənmiş rezerv sayı
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Daxil olun" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const listings = await prisma.listing.findMany({
    where: { ownerId: user.id, status: { not: "deleted" } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { bookings: { where: { status: "confirmed" } } },
      },
      bookings: {
        where: { status: "confirmed", checkOut: { gte: today } },
        orderBy: { checkIn: "asc" },
        select: {
          id: true,
          guestName: true,
          guestPhone: true,
          checkIn: true,
          checkOut: true,
          guests: true,
          total: true,
        },
      },
    },
  });

  return NextResponse.json(
    listings.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      region: l.region,
      type: l.type,
      pricePerNight: l.pricePerNight,
      status: l.status,
      photo: l.photo,
      confirmedBookings: l._count.bookings,
      guests: l.bookings.map((b) => ({
        id: b.id,
        guestName: b.guestName,
        guestPhone: b.guestPhone,
        checkIn: b.checkIn.toISOString().slice(0, 10),
        checkOut: b.checkOut.toISOString().slice(0, 10),
        people: b.guests,
        total: b.total,
      })),
    }))
  );
}
