import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/admin";
import { getGateway } from "@/lib/payments";
import { recordRefund } from "@/lib/ledger";
import { audit, requestIp } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "admin-action", 60, 60_000);
  if (limited) return limited;

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
  const ip = requestIp(req);

  // ---- Elan moderasiyası ----
  if (kind === "listing" && (action === "approve" || action === "reject")) {
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      return NextResponse.json({ error: "Qeyd tapılmadı" }, { status: 404 });
    }
    const status = action === "approve" ? "approved" : "rejected";
    await prisma.listing.update({ where: { id }, data: { status } });
    await audit({
      actor: "admin",
      actorType: "admin",
      action: `listing.${action}`,
      targetType: "listing",
      targetId: id,
      meta: { from: listing.status, to: status, title: listing.title },
      ip,
    });
    return NextResponse.json({ ok: true });
  }

  // ---- Rezervin admin tərəfindən ləğvi ----
  if (kind === "booking" && action === "cancel") {
    const b = await prisma.booking.findUnique({ where: { id } });
    if (!b) {
      return NextResponse.json({ error: "Qeyd tapılmadı" }, { status: 404 });
    }

    // İdempotent: artıq ləğv olunubsa TOXUNMA.
    // (Əvvəlki kod burada refundedAt/refundRef-i null-a yazıb refund izini
    //  MƏHV EDİRDİ — ikinci klik sübutu silirdi.)
    if (b.status === "cancelled") {
      return NextResponse.json({
        ok: true,
        alreadyCancelled: true,
        refunded: Boolean(b.refundedAt),
      });
    }

    let refundRef = "";
    let refundError = "";
    if (b.paidAt && b.paymentRef) {
      const r = await getGateway().refund(b.paymentRef, b.deposit);
      if (r.ok) refundRef = r.ref;
      else refundError = r.error ?? "naməlum xəta";
    }

    // Refund LAZIM idi, amma alınmadı → ləğv etmirik.
    // Əks halda qonaq həm evsiz, həm pulsuz qalır və izi də olmur.
    if (b.paidAt && b.paymentRef && !refundRef) {
      await audit({
        actor: "admin",
        actorType: "admin",
        action: "booking.cancel.refund_failed",
        targetType: "booking",
        targetId: id,
        meta: { code: b.code, deposit: b.deposit, error: refundError },
        ip,
      });
      console.error("[admin] refund uğursuz, ləğv dayandırıldı:", id, refundError);
      return NextResponse.json(
        { error: `Beh geri qaytarıla bilmədi (${refundError}) — ləğv edilmədi` },
        { status: 502 }
      );
    }

    await prisma.booking.update({
      where: { id },
      data: {
        status: "cancelled",
        ...(refundRef ? { refundedAt: new Date(), refundRef } : {}),
      },
    });

    // Mühasibat: hosta borcu ləğv et, refundu yaz (qonaq axını ilə eyni)
    await recordRefund(id, refundRef ? b.deposit : 0, refundRef);

    await audit({
      actor: "admin",
      actorType: "admin",
      action: "booking.cancel",
      targetType: "booking",
      targetId: id,
      meta: { code: b.code, deposit: b.deposit, refunded: Boolean(refundRef), refundRef },
      ip,
    });

    return NextResponse.json({ ok: true, refunded: Boolean(refundRef) });
  }

  return NextResponse.json({ error: "Naməlum əməliyyat" }, { status: 400 });
}
