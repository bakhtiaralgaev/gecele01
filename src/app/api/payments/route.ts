import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGateway, isTestMode } from "@/lib/payments";
import { notifyBookingConfirmed } from "@/lib/notify";

export const dynamic = "force-dynamic";

// Beh ödənişi: pending rezervasiyanı ödəyib təsdiqləyir.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
  }

  const bookingId = String(body.bookingId ?? "");
  const cardNumber = String(body.cardNumber ?? "");
  const cardExpiry = String(body.cardExpiry ?? "");
  const cardCvv = String(body.cardCvv ?? "");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: { select: { title: true, region: true, hostPhone: true } },
      user: { select: { email: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Rezervasiya tapılmadı" }, { status: 404 });
  }
  if (booking.status === "confirmed") {
    // İdempotent: artıq ödənilib
    return NextResponse.json({
      code: booking.code,
      deposit: booking.deposit,
      testMode: isTestMode(),
    });
  }
  if (booking.status !== "pending") {
    return NextResponse.json({ error: "Bu rezervasiya ləğv edilib" }, { status: 410 });
  }
  if (!booking.expiresAt || booking.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Ödəniş müddəti bitib — tarixlər boşaldıldı, yenidən rezerv edin" },
      { status: 410 }
    );
  }

  // Xarici ödəniş çağırışı tranzaksiyadan KƏNARDA aparılır
  const charge = await getGateway().charge({
    amountAzn: booking.deposit,
    description: `Gecələ beh — ${booking.listing.title} (${booking.code})`,
    cardNumber,
    cardExpiry,
    cardCvv,
    bookingId: booking.id,
  });

  // Payriff (canlı): ödəniş hosted checkout səhifəsində tamamlanır — yönləndir
  if (charge.redirectUrl) {
    if (charge.ref) {
      await prisma.booking.updateMany({
        where: { id: booking.id, status: "pending" },
        data: { paymentRef: charge.ref },
      });
    }
    return NextResponse.json({ redirectUrl: charge.redirectUrl });
  }

  if (!charge.ok) {
    return NextResponse.json(
      { error: charge.error ?? "Ödəniş alınmadı" },
      { status: 402 }
    );
  }

  // Guard-lı yeniləmə: yalnız hələ də pending-dirsə təsdiqlə
  const updated = await prisma.booking.updateMany({
    where: { id: booking.id, status: "pending", expiresAt: { gt: new Date() } },
    data: {
      status: "confirmed",
      paidAt: new Date(),
      paymentRef: charge.ref,
    },
  });

  if (updated.count === 0) {
    // Charge uğurlu, lakin rezerv aralıqda dəyişib — behi dərhal geri qaytar
    await getGateway().refund(charge.ref, booking.deposit);
    return NextResponse.json(
      { error: "Rezervasiya statusu dəyişib — behiniz geri qaytarıldı" },
      { status: 409 }
    );
  }

  // Bildiriş — demo: konsola log, canlı: SMS/email
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

  return NextResponse.json({
    code: booking.code,
    deposit: booking.deposit,
    testMode: isTestMode(),
  });
}
