import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAbandonedBooking } from "@/lib/notify";
import { markEligiblePayouts } from "@/lib/ledger";

export const dynamic = "force-dynamic";

// Tərk edilmiş rezerv bərpası — Vercel Cron hər 10 dəqiqədən bir GET çağırır.
// Ödənişə çatıb 20+ dəq getmiş pending rezervlərə bir dəfə xatırlatma göndərir.
// Qorunma: Authorization: Bearer <CRON_SECRET> (Vercel avtomatik əlavə edir).
const MIN_AGE_MS = 20 * 60 * 1000;
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gecele.az";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Prod-da açar olmadan işə düşməsin
    return NextResponse.json({ error: "CRON_SECRET yoxdur" }, { status: 503 });
  }

  const now = Date.now();
  const abandoned = await prisma.booking.findMany({
    where: {
      status: "pending",
      recoveryNotifiedAt: null,
      createdAt: {
        lt: new Date(now - MIN_AGE_MS),
        gt: new Date(now - MAX_AGE_MS),
      },
    },
    take: 100,
    include: {
      listing: { select: { title: true, region: true, slug: true } },
      user: { select: { email: true } },
    },
  });

  let sent = 0;
  for (const b of abandoned) {
    if (!b.guestPhone) continue;

    // Atomik claim: yalnız hələ bildirilməmiş rezervi tutmaq. İki paralel cron
    // eyni rezervi görsə, yalnız biri claim edir → ikiqat SMS olmur.
    const claim = await prisma.booking.updateMany({
      where: { id: b.id, recoveryNotifiedAt: null },
      data: { recoveryNotifiedAt: new Date() },
    });
    if (claim.count === 0) continue; // başqa run artıq tutub

    try {
      await notifyAbandonedBooking({
        guestPhone: b.guestPhone,
        guestEmail: b.user?.email ?? null,
        title: b.listing.title,
        region: b.listing.region,
        bookingUrl: `${SITE_URL}/ev/${b.listing.slug}`,
      });
      sent++;
    } catch (e) {
      // Göndərmə uğursuzdursa claim-i geri qaytar ki, növbəti run yenidən cəhd etsin
      console.error("abandoned recovery failed:", b.id, e);
      await prisma.booking
        .update({ where: { id: b.id }, data: { recoveryNotifiedAt: null } })
        .catch(() => {});
    }
  }

  // Beh Qoruması: girişi çatmış rezervlərin behini ev sahibinə ödənişə aç
  // (pending → eligible). İdempotentdir, hər run-da təhlükəsiz işləyir.
  const eligible = await markEligiblePayouts();

  return NextResponse.json({
    ok: true,
    candidates: abandoned.length,
    sent,
    payoutsEligible: eligible,
  });
}
