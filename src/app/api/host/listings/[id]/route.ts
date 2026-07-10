import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function ownedListing(req: NextRequest, id: string) {
  const user = await getSessionUser(req);
  if (!user) {
    return { error: NextResponse.json({ error: "Daxil olun" }, { status: 401 }) };
  }
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing || listing.ownerId !== user.id) {
    return { error: NextResponse.json({ error: "Elan tapılmadı" }, { status: 404 }) };
  }
  return { listing };
}

// Qiymət dəyiş / dayandır / aktivləşdir
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await ownedListing(req, params.id);
  if ("error" in result) return result.error;
  const listing = result.listing;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // boş gövdə
  }

  const data: {
    pricePerNight?: number;
    status?: string;
    previousPrice?: number | null;
    priceUpdatedAt?: Date;
  } = {};

  if (body.pricePerNight !== undefined) {
    const p = Number(body.pricePerNight);
    if (!Number.isFinite(p) || p < 20 || p > 100000) {
      return NextResponse.json(
        { error: "Qiymət düzgün deyil (min 20 ₼)" },
        { status: 400 }
      );
    }
    const newPrice = Math.round(p);
    if (newPrice !== listing.pricePerNight) {
      data.pricePerNight = newPrice;
      data.priceUpdatedAt = new Date();
      // Qiymət DÜŞSÜR: köhnə qiyməti "üstündən xətt" nişanı üçün saxla.
      // QALXIR: köhnəni təmizlə ki, saxta "endirim" görünməsin.
      data.previousPrice = newPrice < listing.pricePerNight ? listing.pricePerNight : null;
    }
  }

  if (body.action === "pause" && listing.status === "approved") {
    data.status = "paused";
  } else if (body.action === "activate" && listing.status === "paused") {
    data.status = "approved";
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Tətbiq ediləcək dəyişiklik yoxdur" },
      { status: 400 }
    );
  }

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data,
  });
  return NextResponse.json({
    ok: true,
    status: updated.status,
    pricePerNight: updated.pricePerNight,
  });
}

// Elanı sil (soft-delete). Gələcək təsdiqlənmiş rezervi varsa qadağandır.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await ownedListing(req, params.id);
  if ("error" in result) return result.error;
  const listing = result.listing;

  const active = await prisma.booking.count({
    where: {
      listingId: listing.id,
      status: "confirmed",
      checkOut: { gte: new Date() },
    },
  });
  if (active > 0) {
    return NextResponse.json(
      { error: "Aktiv rezervasiyası olan elan silinə bilməz — əvvəlcə dayandırın" },
      { status: 409 }
    );
  }

  await prisma.listing.update({
    where: { id: listing.id },
    data: { status: "deleted" },
  });
  return NextResponse.json({ ok: true });
}
