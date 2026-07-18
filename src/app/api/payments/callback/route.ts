import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGateway } from "@/lib/payments";
import { notifyBookingConfirmed } from "@/lib/notify";
import { recordDepositPaid } from "@/lib/ledger";
import { audit, requestIp } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Payriff hosted checkout təsdiqi buraya qayıdır (approveURL).
//
// TƏHLÜKƏSİZLİK: bu URL istifadəçinin brauzerinə verilir — ona GÜVƏNMİRİK.
// Əvvəllər ?booking=<id> parametri birbaşa rezervi "ödənilmiş" edirdi, yəni
// istənilən adam ödəniş etmədən rezervini təsdiqləyə bilərdi. İndi təsdiq
// yalnız şlüzün özündən (server-to-server) alınan "paid" cavabı ilə verilir.
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

  if (!booking) {
    return NextResponse.redirect(`${site}/rezervlerim`);
  }

  // Artıq təsdiqlənibsə — idempotent, sadəcə yönləndir
  if (booking.status !== "pending") {
    return NextResponse.redirect(`${site}/rezervlerim`);
  }

  // Ödənişi şlüzdən yoxla. paymentRef (Payriff orderId) /api/payments-də
  // yönləndirmədən əvvəl yazılır.
  if (!booking.paymentRef) {
    return NextResponse.redirect(`${site}/odenis/${booking.id}`);
  }

  const status = await getGateway().getOrderStatus(booking.paymentRef);
  if (!status.paid) {
    // Ödənilməyib / naməlum — təsdiq YOXDUR, ödəniş səhifəsinə qaytar.
    // Bu izi saxlayırıq: ödənişsiz callback cəhdi fırıldaq siqnalı ola bilər.
    await audit({
      actor: "system",
      actorType: "system",
      action: "payment.callback.rejected",
      targetType: "booking",
      targetId: booking.id,
      meta: {
        code: booking.code,
        paymentRef: booking.paymentRef,
        gatewaySaid: status.error ?? "paid=false",
      },
      ip: requestIp(req),
    });
    return NextResponse.redirect(`${site}/odenis/${booking.id}`);
  }

  // Guard-lı yeniləmə: yalnız hələ də pending-dirsə təsdiqlə (ikiqat callback-ə qarşı)
  const updated = await prisma.booking.updateMany({
    where: { id: booking.id, status: "pending" },
    data: { status: "confirmed", paidAt: new Date() },
  });

  if (updated.count > 0) {
    // Mühasibat: beh daxil oldu, hosta borc yarandı (girişdən sonra açılır)
    await recordDepositPaid({
      id: booking.id,
      total: booking.total,
      deposit: booking.deposit,
      checkIn: booking.checkIn,
      paymentRef: booking.paymentRef,
      listingId: booking.listingId,
    });

    await audit({
      actor: booking.userId ?? `guest:${booking.code}`,
      actorType: "user",
      action: "payment.callback.confirmed",
      targetType: "booking",
      targetId: booking.id,
      meta: {
        code: booking.code,
        deposit: booking.deposit,
        paymentRef: booking.paymentRef,
      },
      ip: requestIp(req),
    });

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

  return NextResponse.redirect(`${site}/rezervlerim`);
}

export async function GET(req: NextRequest) {
  return confirm(req);
}

export async function POST(req: NextRequest) {
  return confirm(req);
}
