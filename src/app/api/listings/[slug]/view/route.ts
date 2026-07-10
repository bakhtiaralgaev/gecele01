import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VIEWER_COOKIE = "gecele_vid";
const DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000; // eyni baxıcı 6 saatda bir sayılır

// Elan baxışını qeyd edir — real "24 saatda N baxış" sosial sübutu üçün.
// Baxış qeydi GET-də deyil, ayrıca POST-da olur ki, GET keşlənə bilsin.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const listing = await prisma.listing.findFirst({
    where: {
      OR: [{ slug: params.slug }, { id: params.slug }],
      status: "approved",
    },
    select: { id: true },
  });
  if (!listing) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  let viewerId = req.cookies.get(VIEWER_COOKIE)?.value ?? "";
  let setCookie = false;
  if (!/^[0-9a-f-]{16,40}$/i.test(viewerId)) {
    viewerId = randomUUID();
    setCookie = true;
  }

  // Dedupe: eyni baxıcı son 6 saatda bu elana baxıbsa, təzə qeyd yaratmırıq.
  const recent = await prisma.listingView.findFirst({
    where: {
      listingId: listing.id,
      viewerId,
      createdAt: { gt: new Date(Date.now() - DEDUPE_WINDOW_MS) },
    },
    select: { id: true },
  });
  if (!recent) {
    await prisma.listingView.create({
      data: { listingId: listing.id, viewerId },
    });
  }

  const res = NextResponse.json({ ok: true });
  if (setCookie) {
    res.cookies.set(VIEWER_COOKIE, viewerId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return res;
}
