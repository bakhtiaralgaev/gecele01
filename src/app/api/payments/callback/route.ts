import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyBookingConfirmed } from "@/lib/notify";

export const dynamic = "force-dynamic";

// Payriff hosted checkout təsdiqi buraya qayıdır (approveURL).
// Uğurlu ödənişdə pending rezerv təsdiqlənir, qonaq /rezervlerim-ə yönləndirilir.
async function confirm(req: NextRequest) {
  const bookingId = req.nextUrl.searchParams.get("booking") ?? "";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: { select: { title: true, region: true, hostPhone: true } },
      user: { select: { email: true } },
    },
  });

  if (booking && booking.status === "pending") {
    const updated = await prisma.booking.updateMany({
      where: { id: booking.id, status: "pending" },
      data: { status: "confirmed", paidAt: new Date() },
    });
    if (updated.count > 0) {
      await notifyBookingConfirmed({
        code: booking.code,
        title: booking.listing.title,
        region: booking.listing.region,
        checkIn: booking.checkIn.toISOString().slice(0, 10),
        checkOut: booking.checkOut.toISOString().slice(0, 10),
        guests: booking.guests,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        deposit: booking.deposit,
        total: booking.total,
        hostPhone: booking.listing.hostPhone || undefined,
        guestEmail: booking.user?.email ?? null,
      });
    }
  }

  return NextResponse.redirect(`${site}/rezervlerim`);
}

export async function GET(req: NextRequest) {
  return confirm(req);
}

export async function POST(req: NextRequest) {
  return confirm(req);
}
