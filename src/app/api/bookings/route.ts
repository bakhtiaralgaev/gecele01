import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, normalizePhone } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SERVICE_FEE_RATE = 0.05;
const DEPOSIT_RATE = 0.2;
const HOLD_MINUTES = 15; // pending rezervin tarixləri tutma müddəti

function makeCode(): string {
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `GCL-${s}`;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
  }

  const sessionUser = await getSessionUser(req);
  const listingId = String(body.listingId ?? "");
  const guestName = String(body.guestName ?? "").trim();
  const guestPhone = normalizePhone(String(body.guestPhone ?? ""));
  const guests = Number(body.guests);
  const checkInStr = String(body.checkIn ?? "");
  const checkOutStr = String(body.checkOut ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkInStr) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOutStr)) {
    return NextResponse.json({ error: "Tarixləri seçin" }, { status: 400 });
  }
  const checkIn = new Date(`${checkInStr}T12:00:00Z`);
  const checkOut = new Date(`${checkOutStr}T12:00:00Z`);
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);

  if (nights < 1) {
    return NextResponse.json({ error: "Çıxış tarixi girişdən sonra olmalıdır" }, { status: 400 });
  }
  if (checkIn.getTime() < Date.now() - 86_400_000) {
    return NextResponse.json({ error: "Keçmiş tarixə rezervasiya olmaz" }, { status: 400 });
  }
  if (!guestName || guestName.length < 2) {
    return NextResponse.json({ error: "Adınızı yazın" }, { status: 400 });
  }
  if (!/^\+?\d{9,13}$/.test(guestPhone)) {
    return NextResponse.json({ error: "Telefon nömrəsini düzgün yazın (məs: +994501234567)" }, { status: 400 });
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findFirst({
        where: { id: listingId, status: "approved" },
      });
      if (!listing) throw new Error("NOT_FOUND");
      if (!Number.isFinite(guests) || guests < 1 || guests > listing.maxGuests) {
        throw new Error("GUESTS");
      }

      // Konflikt: təsdiqlənmiş VƏ YA hələ vaxtı bitməmiş pending rezervlər tarixi tutur
      const clash = await tx.booking.findFirst({
        where: {
          listingId: listing.id,
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
          OR: [
            { status: "confirmed" },
            { status: "pending", expiresAt: { gt: new Date() } },
          ],
        },
      });
      if (clash) throw new Error("CONFLICT");

      const base = listing.pricePerNight * nights;
      const fee = Math.round(base * SERVICE_FEE_RATE);
      const total = base + fee;
      const deposit = Math.round(total * DEPOSIT_RATE);

      return tx.booking.create({
        data: {
          listingId: listing.id,
          checkIn,
          checkOut,
          guests: Math.round(guests),
          guestName,
          guestPhone,
          total,
          deposit,
          code: makeCode(),
          status: "pending",
          userId: sessionUser?.id ?? null,
          expiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000),
        },
      });
    });

    // Ödəniş səhifəsinə yönləndirmə üçün
    return NextResponse.json({ bookingId: booking.id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "CONFLICT") {
      return NextResponse.json(
        { error: "Bu tarixlər artıq rezerv olunub — başqa tarix seçin" },
        { status: 409 }
      );
    }
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Elan tapılmadı" }, { status: 404 });
    }
    if (msg === "GUESTS") {
      return NextResponse.json({ error: "Qonaq sayı limitdən çoxdur" }, { status: 400 });
    }
    console.error("booking error:", e);
    return NextResponse.json({ error: "Xəta baş verdi — yenidən cəhd edin" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const phone = normalizePhone(req.nextUrl.searchParams.get("phone") ?? "");

  // Telefon verilməyibsə, hesab sessiyası üzrə axtarılır
  let where: { guestPhone: string } | { userId: string };
  if (/^\+?\d{9,13}$/.test(phone)) {
    where = { guestPhone: phone };
  } else {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Telefon nömrəsini düzgün yazın" },
        { status: 400 }
      );
    }
    where = { userId: user.id };
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { listing: { select: { title: true, region: true, photo: true } } },
  });

  const now = Date.now();
  return NextResponse.json(
    bookings.map((b) => ({
      id: b.id,
      code: b.status === "confirmed" ? b.code : "—",
      title: b.listing.title,
      region: b.listing.region,
      photo: b.listing.photo,
      checkIn: b.checkIn.toISOString().slice(0, 10),
      checkOut: b.checkOut.toISOString().slice(0, 10),
      guests: b.guests,
      total: b.total,
      deposit: b.deposit,
      status:
        b.status === "pending" && b.expiresAt && b.expiresAt.getTime() < now
          ? "expired"
          : b.status,
    }))
  );
}
