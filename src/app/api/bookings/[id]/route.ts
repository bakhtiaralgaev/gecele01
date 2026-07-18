import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGateway, isTestMode } from "@/lib/payments";
import { getSessionUser } from "@/lib/auth";
import { recordRefund } from "@/lib/ledger";
import { audit, requestIp } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Ödəniş səhifəsi üçün rezervasiya xülasəsi.
// Kod yalnız təsdiqlənmiş rezervasiyada qaytarılır.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const b = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      listing: { select: { title: true, region: true, photo: true } },
    },
  });

  if (!b) {
    return NextResponse.json({ error: "Rezervasiya tapılmadı" }, { status: 404 });
  }

  const nights = Math.round(
    (b.checkOut.getTime() - b.checkIn.getTime()) / 86_400_000
  );

  return NextResponse.json({
    id: b.id,
    title: b.listing.title,
    region: b.listing.region,
    photo: b.listing.photo,
    checkIn: b.checkIn.toISOString().slice(0, 10),
    checkOut: b.checkOut.toISOString().slice(0, 10),
    nights,
    guests: b.guests,
    guestName: b.guestName,
    total: b.total,
    deposit: b.deposit,
    status: b.status,
    expiresAt: b.expiresAt ? b.expiresAt.getTime() : null,
    code: b.status === "confirmed" ? b.code : null,
    testMode: isTestMode(),
  });
}

const CANCEL_LOCK_HOURS = 48;

// Rezervasiyanı ləğv et.
// Sahiblik: hesab sessiyası (userId) VƏ YA sessiya sahibinin OTP ilə
// TƏSDİQLƏNMİŞ telefonu ilə edilmiş anonim rezerv.
// Təsdiqlənmiş rezerv girişə 48 saatdan az qalıbsa onlayn ləğv olunmur.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // Gövdəsiz sorğu — sahiblik sessiyadan yoxlanacaq
  }

  const action = String(body.action ?? "cancel");
  if (action !== "cancel") {
    return NextResponse.json({ error: "Naməlum əməliyyat" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!booking) {
    return NextResponse.json({ error: "Rezervasiya tapılmadı" }, { status: 404 });
  }

  // TƏHLÜKƏSİZLİK: əvvəllər gövdədəki telefon sahiblik sübutu sayılırdı —
  // nömrəni bilən yad adam başqasının rezervini ləğv edib refund tetikləyə
  // bilirdi. İndi sessiya məcburidir.
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Ləğv etmək üçün daxil olun" },
      { status: 401 }
    );
  }
  const ownsBySession = booking.userId === user.id;
  const ownsByVerifiedPhone = Boolean(
    user.phone && booking.guestPhone === user.phone
  );
  if (!ownsBySession && !ownsByVerifiedPhone) {
    return NextResponse.json(
      { error: "Bu rezervasiyanı ləğv etmək icazəniz yoxdur" },
      { status: 403 }
    );
  }

  if (booking.status === "cancelled") {
    return NextResponse.json(
      { error: "Rezervasiya artıq ləğv edilib" },
      { status: 400 }
    );
  }
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    return NextResponse.json(
      { error: "Bu rezervasiya ləğv oluna bilməz" },
      { status: 400 }
    );
  }

  const msUntilCheckIn = booking.checkIn.getTime() - Date.now();
  if (
    booking.status === "confirmed" &&
    msUntilCheckIn < CANCEL_LOCK_HOURS * 3_600_000
  ) {
    return NextResponse.json(
      {
        error:
          "Girişə 48 saatdan az qaldığı üçün onlayn ləğv mümkün deyil — ev sahibi ilə əlaqə saxlayın",
      },
      { status: 400 }
    );
  }

  // Ödənilmiş behi Beh Qorumasından geri qaytar
  let refundRef = "";
  if (booking.paidAt && booking.paymentRef) {
    const r = await getGateway().refund(booking.paymentRef, booking.deposit);
    if (r.ok) refundRef = r.ref;
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "cancelled",
      refundedAt: refundRef ? new Date() : null,
      refundRef,
    },
  });

  // Mühasibat: hosta borc ləğv olunur, qaytarılan beh yazılır
  await recordRefund(booking.id, refundRef ? booking.deposit : 0, refundRef);

  // Audit: qonaq özü ləğv etdi + refundun nəticəsi
  await audit({
    actor: user.id,
    actorType: "user",
    action: "booking.cancel",
    targetType: "booking",
    targetId: booking.id,
    meta: {
      code: booking.code,
      deposit: booking.deposit,
      wasPaid: Boolean(booking.paidAt),
      refunded: Boolean(refundRef),
      refundRef,
    },
    ip: requestIp(req),
  });

  return NextResponse.json({
    ok: true,
    status: "cancelled",
    refunded: Boolean(refundRef),
  });
}
