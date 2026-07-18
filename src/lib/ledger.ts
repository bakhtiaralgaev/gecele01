// Mühasibat (ledger) və ev sahibinə ödəniş (payout) qatı.
//
// ⚠️ Bank inteqrasiyası hələ TƏSDİQLƏNMƏYİB (ABB ilə danışıq gözlənilir).
// Ona görə pul HƏRƏKƏTİ payoutGateway adapteri arxasındadır və hazırda "manual"
// rejimdədir: sistem kimə nə borclu olduğunu dəqiq qeyd edir, faktiki köçürmə
// əl ilə aparılır. Bank payout API-si gələndə YALNIZ adapter dəyişir —
// mühasibat məntiqi olduğu kimi qalır.

import { prisma } from "./prisma";
import { SERVICE_FEE_RATE } from "./data";

/**
 * Komissiya (xidmət haqqı) rezervin ümumi məbləğindən geri hesablanır:
 * total = base + round(base * SERVICE_FEE_RATE)  →  base = total / (1 + rate).
 * calcTotal-un çıxışları üçün dəqiqdir.
 */
export function commissionOf(total: number): number {
  const base = Math.round(total / (1 + SERVICE_FEE_RATE));
  return Math.max(0, total - base);
}

export type LedgerKind =
  | "deposit_in" // qonaqdan beh alındı (platformaya daxil)
  | "commission" // platformanın payı
  | "host_payable" // hosta borc yarandı
  | "refund_out" // beh qonağa qaytarıldı
  | "payout_out"; // hosta ödənildi

/** Mühasibat sətri əlavə et. Yalnız append — heç vaxt dəyişdirilmir. */
export async function recordLedger(
  bookingId: string,
  kind: LedgerKind,
  amount: number,
  ref = "",
  note = ""
): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) return;
  await prisma.ledgerEntry.create({
    data: { bookingId, kind, amount: Math.round(amount), ref, note },
  });
}

/**
 * Beh ödənilib rezerv təsdiqlənəndə çağırılır.
 * Yaradır: deposit_in + commission + host_payable sətirləri və Payout qeydi.
 *
 * Beh Qoruması qaydası: payout DƏRHAL ödənilmir — eligibleAt = giriş tarixi.
 * İdempotentdir: eyni booking üçün ikinci dəfə Payout/sətir yaratmır.
 */
export async function recordDepositPaid(booking: {
  id: string;
  total: number;
  deposit: number;
  checkIn: Date;
  paymentRef: string;
  listingId: string;
}) {
  const existing = await prisma.payout.findUnique({
    where: { bookingId: booking.id },
  });
  if (existing) return existing; // idempotent — təkrar callback/ödəniş

  // Komissiya behdən çox ola bilməz (təhlükəsizlik həddi)
  const commission = Math.min(commissionOf(booking.total), booking.deposit);
  const amount = Math.max(0, booking.deposit - commission);

  const listing = await prisma.listing.findUnique({
    where: { id: booking.listingId },
    select: { ownerId: true },
  });

  const payout = await prisma.payout.create({
    data: {
      bookingId: booking.id,
      hostUserId: listing?.ownerId ?? null,
      amount,
      commission,
      status: "pending",
      eligibleAt: booking.checkIn,
    },
  });

  await recordLedger(
    booking.id,
    "deposit_in",
    booking.deposit,
    booking.paymentRef,
    "Beh alındı — Beh Qorumasında saxlanılır"
  );
  await recordLedger(booking.id, "commission", commission, "", "Xidmət haqqı");
  await recordLedger(
    booking.id,
    "host_payable",
    amount,
    "",
    "Ev sahibinə borc — girişdən sonra ödənilir"
  );

  return payout;
}

/**
 * Rezerv ləğv olunanda: hosta borc ləğv edilir (hələ ödənilməyibsə),
 * qaytarılan beh mühasibata yazılır.
 */
export async function recordRefund(
  bookingId: string,
  refundedAmount: number,
  ref: string
): Promise<void> {
  await prisma.payout.updateMany({
    where: {
      bookingId,
      status: { in: ["pending", "eligible", "failed"] },
    },
    data: { status: "cancelled" },
  });
  await recordLedger(
    bookingId,
    "refund_out",
    refundedAmount,
    ref,
    "Beh qonağa qaytarıldı"
  );
}

/**
 * Girişi çatmış payout-ları ödənişə açır (pending → eligible).
 * Yalnız ləğv olunmamış, təsdiqlənmiş rezervlər.
 */
export async function markEligiblePayouts(now = new Date()): Promise<number> {
  const res = await prisma.payout.updateMany({
    where: {
      status: "pending",
      eligibleAt: { lte: now },
      booking: { status: "confirmed" },
    },
    data: { status: "eligible" },
  });
  return res.count;
}

// ---------------------------------------------------------------------------
// Payout şlüzü (bank adapteri)
// ---------------------------------------------------------------------------

export interface PayoutResult {
  ok: boolean;
  ref: string;
  error?: string;
}

interface PayoutGateway {
  name: string;
  send(input: {
    payoutId: string;
    amount: number;
    iban: string;
    holderName: string;
  }): Promise<PayoutResult>;
}

// Bank API-si təsdiqlənənə qədər: əl ilə ödəniş rejimi.
// Pul hərəkəti YOXDUR — admin "eligible" siyahısını görüb əl ilə köçürür.
const manualPayoutGateway: PayoutGateway = {
  name: "manual",
  async send() {
    return {
      ok: false,
      ref: "",
      error:
        "Bank payout inteqrasiyası konfiqurasiya olunmayıb — ödəniş əl ilə aparılır",
    };
  },
};

export function getPayoutGateway(): PayoutGateway {
  // ABB/Payriff payout açarları gələndə real adapter burada qaytarılacaq.
  // Məs: if (process.env.ABB_PAYOUT_KEY) return abbPayoutGateway;
  return manualPayoutGateway;
}

export function payoutLive(): boolean {
  return getPayoutGateway().name !== "manual";
}
