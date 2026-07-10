import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/admin";
import { getGateway } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
  }

  const kind = String(body.kind ?? "");
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");

  try {
    if (kind === "listing" && (action === "approve" || action === "reject")) {
      await prisma.listing.update({
        where: { id },
        data: { status: action === "approve" ? "approved" : "rejected" },
      });
      return NextResponse.json({ ok: true });
    }

    if (kind === "booking" && action === "cancel") {
      const b = await prisma.booking.findUnique({ where: { id } });
      if (!b) {
        return NextResponse.json({ error: "Qeyd tapılmadı" }, { status: 404 });
      }
      // Qonaq axını ilə eyni: ödənilmiş beh geri qaytarılır
      let refundRef = "";
      if (b.status !== "cancelled" && b.paidAt && b.paymentRef) {
        const r = await getGateway().refund(b.paymentRef, b.deposit);
        if (r.ok) refundRef = r.ref;
      }
      await prisma.booking.update({
        where: { id },
        data: {
          status: "cancelled",
          refundedAt: refundRef ? new Date() : null,
          refundRef,
        },
      });
      return NextResponse.json({ ok: true, refunded: Boolean(refundRef) });
    }
  } catch {
    return NextResponse.json({ error: "Qeyd tapılmadı" }, { status: 404 });
  }

  return NextResponse.json({ error: "Naməlum əməliyyat" }, { status: 400 });
}
