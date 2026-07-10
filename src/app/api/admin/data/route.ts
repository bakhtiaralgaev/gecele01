import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });
  }

  const [pendingListings, bookings, confirmedAgg, pendingCount] =
    await Promise.all([
      prisma.listing.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          region: true,
          type: true,
          pricePerNight: true,
          maxGuests: true,
          hostName: true,
          hostPhone: true,
          createdAt: true,
        },
      }),
      prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { listing: { select: { title: true } } },
      }),
      prisma.booking.aggregate({
        where: { status: "confirmed" },
        _count: { id: true },
        _sum: { total: true, deposit: true },
      }),
      prisma.booking.count({
        where: { status: "pending", expiresAt: { gt: new Date() } },
      }),
    ]);

  return NextResponse.json({
    stats: {
      confirmedBookings: confirmedAgg._count.id,
      pendingBookings: pendingCount,
      grossVolume: confirmedAgg._sum.total ?? 0,
      depositsHeld: confirmedAgg._sum.deposit ?? 0,
      pendingListings: pendingListings.length,
    },
    pendingListings: pendingListings.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString().slice(0, 16).replace("T", " "),
    })),
    bookings: bookings.map((b) => ({
      id: b.id,
      code: b.code,
      title: b.listing.title,
      guestName: b.guestName,
      guestPhone: b.guestPhone,
      checkIn: b.checkIn.toISOString().slice(0, 10),
      checkOut: b.checkOut.toISOString().slice(0, 10),
      total: b.total,
      deposit: b.deposit,
      status: b.status,
    })),
  });
}
