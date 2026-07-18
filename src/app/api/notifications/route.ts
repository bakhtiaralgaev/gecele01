import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface NotifItem {
  id: string;
  type:
    | "booking_confirmed"
    | "booking_cancelled"
    | "payment_due"
    | "new_booking"
    | "guest_cancelled"
    | "price_drop";
  title: string;
  body: string;
  href: string;
  at: string; // ISO
}

// Bildiriş mərkəzi — bütün elementlər real DB vəziyyətindən hesablanır (uydurma yox).
// Mesajlar ayrıca söhbət ikonundadır, buraya daxil edilmir.
export async function GET(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!me) return NextResponse.json({ authed: false, items: [] as NotifItem[] });

  const now = new Date();
  const items: NotifItem[] = [];

  // 1) Qonaq kimi rezervlər
  const guestBookings = await prisma.booking.findMany({
    where: { userId: me.id },
    include: { listing: { select: { title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  guestBookings.forEach((b) => {
    const title = b.listing.title;
    if (b.status === "confirmed") {
      items.push({
        id: `bc:${b.id}`,
        type: "booking_confirmed",
        title: "Rezervasiya təsdiqləndi",
        body: `${title} — kod ${b.code}`,
        href: "/rezervlerim",
        at: (b.paidAt ?? b.createdAt).toISOString(),
      });
    } else if (b.status === "cancelled") {
      items.push({
        id: `bx:${b.id}`,
        type: "booking_cancelled",
        title: "Rezervasiya ləğv edildi",
        body: b.refundedAt
          ? `${title} — beh geri qaytarıldı`
          : `${title} — ləğv edildi`,
        href: "/rezervlerim",
        at: (b.refundedAt ?? b.createdAt).toISOString(),
      });
    } else if (
      b.status === "pending" &&
      b.expiresAt !== null &&
      b.expiresAt > now
    ) {
      items.push({
        id: `pd:${b.id}`,
        type: "payment_due",
        title: "Ödəniş gözlənilir",
        body: `${title} — behi ödəyib təsdiqləyin`,
        href: `/odenis/${b.id}`,
        at: b.createdAt.toISOString(),
      });
    }
  });

  // 2) Ev sahibi kimi — elanlarına düşən rezervlər (öz rezervini istisna et)
  const hostBookings = await prisma.booking.findMany({
    where: { listing: { ownerId: me.id } },
    include: { listing: { select: { title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  hostBookings.forEach((b) => {
    if (b.userId === me.id) return; // öz rezervi
    const title = b.listing.title;
    if (b.status === "confirmed") {
      items.push({
        id: `nb:${b.id}`,
        type: "new_booking",
        title: "Yeni rezervasiya",
        body: `${b.guestName} — ${title}`,
        href: "/ev-sahibi",
        at: (b.paidAt ?? b.createdAt).toISOString(),
      });
    } else if (b.status === "cancelled") {
      items.push({
        id: `gx:${b.id}`,
        type: "guest_cancelled",
        title: "Qonaq ləğv etdi",
        body: `${b.guestName} — ${title}`,
        href: "/ev-sahibi",
        at: (b.refundedAt ?? b.createdAt).toISOString(),
      });
    }
  });

  // 3) Seçilmiş evlərdə qiymət düşməsi (real: previousPrice > pricePerNight)
  const wl = await prisma.wishlist.findMany({
    where: { userId: me.id },
    select: { listingId: true },
    take: 100,
  });
  const wlIds = wl.map((w) => w.listingId);
  if (wlIds.length) {
    const dropped = await prisma.listing.findMany({
      where: { id: { in: wlIds }, previousPrice: { not: null } },
      select: {
        id: true,
        slug: true,
        title: true,
        pricePerNight: true,
        previousPrice: true,
        priceUpdatedAt: true,
        createdAt: true,
      },
    });
    dropped.forEach((l) => {
      if (l.previousPrice != null && l.previousPrice > l.pricePerNight) {
        items.push({
          id: `dr:${l.id}`,
          type: "price_drop",
          title: "Seçilmişdə qiymət düşdü",
          body: `${l.title} — ${l.previousPrice}→${l.pricePerNight} ₼`,
          href: `/ev/${l.slug}`,
          at: (l.priceUpdatedAt ?? l.createdAt).toISOString(),
        });
      }
    });
  }

  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return NextResponse.json({ authed: true, items: items.slice(0, 20) });
}
