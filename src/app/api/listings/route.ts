import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { coordsFor } from "@/lib/data";

export const dynamic = "force-dynamic";

function parseAmenities(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function toDto(l: {
  id: string;
  slug: string;
  title: string;
  region: string;
  type: string;
  pricePerNight: number;
  rating: number;
  reviews: number;
  maxGuests: number;
  bedrooms: number;
  pool: boolean;
  amenities: string;
  hostName: string;
  photo: string;
  lat: number | null;
  lng: number | null;
}) {
  const [lat, lng] =
    l.lat != null && l.lng != null ? [l.lat, l.lng] : coordsFor(l.region, l.id);
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    region: l.region,
    type: l.type,
    pricePerNight: l.pricePerNight,
    rating: l.rating,
    reviews: l.reviews,
    maxGuests: l.maxGuests,
    bedrooms: l.bedrooms,
    pool: l.pool,
    amenities: parseAmenities(l.amenities),
    hostName: l.hostName,
    photo: l.photo,
    lat,
    lng,
  };
}

// Axtarış: region, hovuz, qonaq sayı və tarix əlçatanlığı üzrə filtr
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const region = p.get("region");
  const pool = p.get("pool");
  const guests = Number(p.get("guests") ?? 0);
  const checkInStr = p.get("checkIn");
  const checkOutStr = p.get("checkOut");

  let availability = {};
  if (
    checkInStr &&
    checkOutStr &&
    /^\d{4}-\d{2}-\d{2}$/.test(checkInStr) &&
    /^\d{4}-\d{2}-\d{2}$/.test(checkOutStr)
  ) {
    const checkIn = new Date(`${checkInStr}T12:00:00Z`);
    const checkOut = new Date(`${checkOutStr}T12:00:00Z`);
    if (checkOut > checkIn) {
      availability = {
        bookings: {
          none: {
            checkIn: { lt: checkOut },
            checkOut: { gt: checkIn },
            OR: [
              { status: "confirmed" },
              { status: "pending", expiresAt: { gt: new Date() } },
            ],
          },
        },
      };
    }
  }

  const listings = await prisma.listing.findMany({
    where: {
      status: "approved",
      ...(region ? { region } : {}),
      ...(pool === "1" ? { pool: true } : {}),
      ...(guests > 0 ? { maxGuests: { gte: guests } } : {}),
      ...availability,
    },
    orderBy: [{ reviews: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(listings.map(toDto));
}

// Ev sahibi müraciəti — moderasiya üçün "pending" statusla düşür
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
  }

  const user = await getSessionUser(req);

  const title = String(body.title ?? "").trim();
  const region = String(body.region ?? "").trim();
  const type = String(body.type ?? "").trim();
  const hostName = String(body.hostName ?? user?.name ?? "").trim();
  const hostPhone = String(body.hostPhone ?? user?.phone ?? "").trim();
  const pricePerNight = Number(body.pricePerNight);
  const maxGuests = Number(body.maxGuests);
  const bedrooms = Number(body.bedrooms);
  const pool = Boolean(body.pool);
  const photos = Array.isArray(body.photos)
    ? (body.photos as unknown[]).map((p) => String(p)).filter(Boolean).slice(0, 8)
    : [];

  if (
    !title ||
    !region ||
    !type ||
    !hostName ||
    !hostPhone ||
    !Number.isFinite(pricePerNight) ||
    pricePerNight < 20 ||
    !Number.isFinite(maxGuests) ||
    maxGuests < 1 ||
    !Number.isFinite(bedrooms) ||
    bedrooms < 1 ||
    photos.length < 1
  ) {
    return NextResponse.json(
      { error: "Bütün sahələri doldurun və ən azı bir foto yükləyin" },
      { status: 400 }
    );
  }

  const slug =
    title
      .toLowerCase()
      .replace(/[əğıöşçü]/g, (c) =>
        ({ ə: "e", ğ: "g", ı: "i", ö: "o", ş: "s", ç: "c", ü: "u" })[c] ?? c
      )
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) + `-${Date.now().toString(36)}`;

  const listing = await prisma.listing.create({
    data: {
      slug,
      title,
      region,
      type,
      pricePerNight: Math.round(pricePerNight),
      maxGuests: Math.round(maxGuests),
      bedrooms: Math.round(bedrooms),
      pool,
      amenities: JSON.stringify(
        pool ? ["Hovuz", "Manqal", "Parkinq"] : ["Manqal", "Parkinq"]
      ),
      hostName,
      hostPhone,
      ownerId: user?.id ?? null,
      photo: photos[0],
      photos: JSON.stringify(photos),
      lat: coordsFor(region, slug)[0],
      lng: coordsFor(region, slug)[1],
      status: "pending",
    },
  });

  return NextResponse.json({ ok: true, slug: listing.slug }, { status: 201 });
}
