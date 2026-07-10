import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { coordsFor } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const listing = await prisma.listing.findFirst({
    where: {
      OR: [{ slug: params.slug }, { id: params.slug }],
      status: "approved",
    },
    include: {
      bookings: {
        where: { status: "confirmed", checkOut: { gte: new Date() } },
        select: { checkIn: true, checkOut: true },
        orderBy: { checkIn: "asc" },
      },
      reviewList: {
        orderBy: { createdAt: "desc" },
        take: 6,
      },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Elan tapılmadı" }, { status: 404 });
  }

  // Sosial sübut rəqəmləri — hamısı real datadan (store-safe, uydurma yoxdur).
  const now = Date.now();
  const [viewsLast24h, bookingsLast30d, lastBooking] = await Promise.all([
    prisma.listingView.count({
      where: {
        listingId: listing.id,
        createdAt: { gt: new Date(now - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.booking.count({
      where: {
        listingId: listing.id,
        status: { in: ["confirmed", "pending"] },
        createdAt: { gt: new Date(now - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.booking.findFirst({
      where: { listingId: listing.id, status: "confirmed" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const isSuperhost = listing.rating >= 4.8 && listing.reviews >= 10;
  const lastBookedDaysAgo = lastBooking
    ? Math.floor((now - lastBooking.createdAt.getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const priceDropped =
    listing.previousPrice != null && listing.previousPrice > listing.pricePerNight;

  let photos: string[] = [];
  try {
    photos = JSON.parse(listing.photos);
  } catch {
    photos = [];
  }
  if (photos.length === 0) photos = [listing.photo];

  let amenities: string[] = [];
  try {
    const a = JSON.parse(listing.amenities);
    amenities = Array.isArray(a) ? a.map(String) : [];
  } catch {
    amenities = [];
  }

  return NextResponse.json({
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    region: listing.region,
    type: listing.type,
    pricePerNight: listing.pricePerNight,
    previousPrice: priceDropped ? listing.previousPrice : null,
    isSuperhost,
    viewsLast24h,
    bookingsLast30d,
    lastBookedDaysAgo,
    rating: listing.rating,
    reviews: listing.reviews,
    maxGuests: listing.maxGuests,
    bedrooms: listing.bedrooms,
    pool: listing.pool,
    amenities,
    hostName: listing.hostName,
    photo: listing.photo,
    photos,
    lat: listing.lat ?? coordsFor(listing.region, listing.id)[0],
    lng: listing.lng ?? coordsFor(listing.region, listing.id)[1],
    bookedRanges: listing.bookings.map((b) => ({
      checkIn: b.checkIn.toISOString().slice(0, 10),
      checkOut: b.checkOut.toISOString().slice(0, 10),
    })),
    reviewList: listing.reviewList.map((r) => ({
      guestName: r.guestName,
      rating: r.rating,
      text: r.text,
      date: r.createdAt.toISOString().slice(0, 10),
    })),
  });
}
