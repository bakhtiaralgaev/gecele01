import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { coordsFor, REGIONS } from "@/lib/data";
import { rateLimit } from "@/lib/rateLimit";

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
  previousPrice: number | null;
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
    previousPrice:
      l.previousPrice != null && l.previousPrice > l.pricePerNight
        ? l.previousPrice
        : null,
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

const DAY_MS = 86_400_000;
const MAX_FLEX = 14;

function clampInt(raw: string | null, min: number): number {
  const n = Math.trunc(Number(raw ?? 0));
  return Number.isFinite(n) ? Math.max(min, n) : min;
}

/** Verilmiş pəncərədə heç bir canlı rezervasiya ilə kəsişməyən elanlar. */
function freeBetween(checkIn: Date, checkOut: Date, now: Date) {
  return {
    bookings: {
      none: {
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
        OR: [
          { status: "confirmed" },
          { status: "pending", expiresAt: { gt: now } },
        ],
      },
    },
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
  const flexRaw = Math.trunc(Number(p.get("flex") ?? 0));
  const flex = Number.isFinite(flexRaw)
    ? Math.min(MAX_FLEX, Math.max(0, flexRaw))
    : 0;

  // Zəngin filtrlər: qiymət diapazonu, ev tipi, yataq otağı, imkanlar
  const minPrice = clampInt(p.get("minPrice"), 0);
  const maxPrice = clampInt(p.get("maxPrice"), 0);
  const bedrooms = clampInt(p.get("bedrooms"), 0);
  const priceFilter: { gte?: number; lte?: number } = {};
  if (minPrice > 0) priceFilter.gte = minPrice;
  if (maxPrice > 0 && maxPrice >= minPrice) priceFilter.lte = maxPrice;
  const typeList = (p.get("type") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const amenitiesReq = (p.get("amenities") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  let availability = {};
  if (
    checkInStr &&
    checkOutStr &&
    /^\d{4}-\d{2}-\d{2}$/.test(checkInStr) &&
    /^\d{4}-\d{2}-\d{2}$/.test(checkOutStr)
  ) {
    const checkIn = new Date(`${checkInStr}T12:00:00Z`);
    const checkOut = new Date(`${checkOutStr}T12:00:00Z`);
    const now = new Date();
    if (checkOut > checkIn) {
      // ±flex: gecə sayı sabit qalır, pəncərə sürüşür. Ən azı biri boşdursa uyğundur.
      const windows = [];
      for (let k = -flex; k <= flex; k++) {
        const from = new Date(checkIn.getTime() + k * DAY_MS);
        const to = new Date(checkOut.getTime() + k * DAY_MS);
        if (from < now) continue; // keçmişə sürüşən pəncərə mənasızdır
        windows.push(freeBetween(from, to, now));
      }
      // Bütün pəncərələr keçmişdədirsə filtri səssizcə atmırıq — dəqiq pəncərə qalır.
      if (windows.length === 0) windows.push(freeBetween(checkIn, checkOut, now));
      availability = windows.length === 1 ? windows[0] : { OR: windows };
    }
  }

  const listings = await prisma.listing.findMany({
    where: {
      status: "approved",
      ...(region ? { region } : {}),
      ...(pool === "1" ? { pool: true } : {}),
      ...(guests > 0 ? { maxGuests: { gte: guests } } : {}),
      ...(Object.keys(priceFilter).length ? { pricePerNight: priceFilter } : {}),
      ...(typeList.length ? { type: { in: typeList } } : {}),
      ...(bedrooms > 0 ? { bedrooms: { gte: bedrooms } } : {}),
      ...availability,
    },
    orderBy: [{ reviews: "desc" }, { createdAt: "desc" }],
  });

  // İmkanlar SQLite-də JSON mətn kimi saxlanır — Prisma sorğusunda süzülmür,
  // ona görə yüklədikdən sonra bütün seçilmiş imkanları ehtiva edənləri saxlayırıq.
  const dtos = listings
    .map(toDto)
    .filter((d) => amenitiesReq.every((a) => d.amenities.includes(a)));

  return NextResponse.json(dtos);
}

// Ev sahibi müraciəti — moderasiya üçün "pending" statusla düşür
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "listing-create", 10, 10 * 60_000);
  if (limited) return limited;

  // Elan yaratmaq üçün giriş məcburidir — anonim spam elanların qarşısını alır
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Elan yerləşdirmək üçün daxil olun" },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const region = String(body.region ?? "").trim();
  if (!(REGIONS as readonly string[]).includes(region)) {
    return NextResponse.json({ error: "Bölgə düzgün seçilməyib" }, { status: 400 });
  }
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
