import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Rəy yalnız təsdiqlənmiş rezervasiya kodu + rezervasiya telefonu ilə yazılır.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
  }

  const slug = String(body.slug ?? "");
  const code = String(body.code ?? "").trim().toUpperCase();
  const phone = normalizePhone(String(body.phone ?? ""));
  const rating = Number(body.rating);
  const text = String(body.text ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Qiymət 1-5 arası olmalıdır" }, { status: 400 });
  }
  if (text.length < 10) {
    return NextResponse.json(
      { error: "Rəy ən azı 10 simvol olmalıdır" },
      { status: 400 }
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { code },
    include: { listing: { select: { slug: true, id: true } } },
  });

  if (
    !booking ||
    booking.status !== "confirmed" ||
    booking.guestPhone !== phone ||
    booking.listing.slug !== slug
  ) {
    return NextResponse.json(
      { error: "Rezervasiya kodu və telefon uyğun gəlmir" },
      { status: 403 }
    );
  }

  // Rəy yalnız qonaqlıq bitdikdən sonra — gələcək tarixli rezervə rəy olmaz
  if (booking.checkOut > new Date()) {
    return NextResponse.json(
      { error: "Rəy yalnız qonaqlıq bitdikdən sonra yazıla bilər" },
      { status: 403 }
    );
  }

  const existing = await prisma.review.findUnique({
    where: { bookingCode: code },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Bu rezervasiya üçün rəy artıq yazılıb" },
      { status: 409 }
    );
  }

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        listingId: booking.listing.id,
        bookingCode: code,
        guestName: booking.guestName,
        rating,
        text,
      },
    });
    // Çəkili orta: köhnə aqreqat + yeni rəy
    const l = await tx.listing.findUniqueOrThrow({
      where: { id: booking.listing.id },
      select: { rating: true, reviews: true },
    });
    const newCount = l.reviews + 1;
    const newRating =
      Math.round(((l.rating * l.reviews + rating) / newCount) * 10) / 10;
    await tx.listing.update({
      where: { id: booking.listing.id },
      data: { rating: newRating, reviews: newCount },
    });
    return created;
  });

  return NextResponse.json(
    {
      guestName: review.guestName,
      rating: review.rating,
      text: review.text,
      date: review.createdAt.toISOString().slice(0, 10),
    },
    { status: 201 }
  );
}
