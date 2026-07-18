import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  commissionOf,
  recordDepositPaid,
  recordRefund,
  markEligiblePayouts,
} from "@/lib/ledger";
import { calcTotal } from "@/lib/data";

let listingId = "";
const created: string[] = [];

async function makeBooking(checkIn: Date, total: number, deposit: number) {
  const b = await prisma.booking.create({
    data: {
      listingId,
      checkIn,
      checkOut: new Date(checkIn.getTime() + 3 * 86_400_000),
      guests: 2,
      guestName: "Ledger Test",
      guestPhone: "+994500000000",
      total,
      deposit,
      code: `GCL-L${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      status: "confirmed",
      paidAt: new Date(),
      paymentRef: "TEST-REF",
    },
  });
  created.push(b.id);
  return b;
}

beforeAll(async () => {
  const l = await prisma.listing.create({
    data: {
      slug: `ledger-test-${Date.now()}`,
      title: "Ledger evi",
      region: "Quba",
      type: "Villa",
      pricePerNight: 100,
      maxGuests: 4,
      bedrooms: 2,
      amenities: "[]",
      hostName: "Host",
      photo: "https://example.com/x.jpg",
      status: "approved",
    },
  });
  listingId = l.id;
});

afterAll(async () => {
  await prisma.ledgerEntry.deleteMany({ where: { bookingId: { in: created } } });
  await prisma.payout.deleteMany({ where: { bookingId: { in: created } } });
  await prisma.booking.deleteMany({ where: { listingId } });
  await prisma.listing.deleteMany({ where: { id: listingId } });
  await prisma.$disconnect();
});

describe("commissionOf", () => {
  it("calcTotal-un çıxışı ilə dəqiq uyğun gəlir", () => {
    // Müxtəlif qiymət/gecə kombinasiyalarında komissiya = fee olmalıdır
    for (const price of [75, 100, 140, 320, 499]) {
      for (const nights of [1, 2, 3, 7]) {
        const { fee, total } = calcTotal(price, nights);
        expect(commissionOf(total)).toBe(fee);
      }
    }
  });
});

describe("recordDepositPaid", () => {
  it("payout + komissiya = beh (pul itmir/yaranmır)", async () => {
    const { total, deposit } = calcTotal(100, 3);
    const b = await makeBooking(new Date("2027-09-01T12:00:00Z"), total, deposit);

    const p = await recordDepositPaid({
      id: b.id,
      total: b.total,
      deposit: b.deposit,
      checkIn: b.checkIn,
      paymentRef: b.paymentRef,
      listingId: b.listingId,
    });

    expect(p!.amount + p!.commission).toBe(b.deposit);
    expect(p!.status).toBe("pending");
    // Beh Qoruması: girişə qədər açılmır
    expect(p!.eligibleAt.getTime()).toBe(b.checkIn.getTime());
  });

  it("idempotentdir — iki dəfə çağırılsa bir payout qalır", async () => {
    const { total, deposit } = calcTotal(140, 2);
    const b = await makeBooking(new Date("2027-09-10T12:00:00Z"), total, deposit);

    const args = {
      id: b.id,
      total: b.total,
      deposit: b.deposit,
      checkIn: b.checkIn,
      paymentRef: b.paymentRef,
      listingId: b.listingId,
    };
    await recordDepositPaid(args);
    await recordDepositPaid(args); // təkrar callback

    const payouts = await prisma.payout.findMany({ where: { bookingId: b.id } });
    const entries = await prisma.ledgerEntry.findMany({ where: { bookingId: b.id } });
    expect(payouts).toHaveLength(1);
    // deposit_in + commission + host_payable = 3 sətir (təkrarlanmayıb)
    expect(entries).toHaveLength(3);
  });
});

describe("recordRefund", () => {
  it("ləğvdən sonra payout cancelled və kitablar balanslaşır (netHeld = 0)", async () => {
    const { total, deposit } = calcTotal(100, 3);
    const b = await makeBooking(new Date("2027-10-01T12:00:00Z"), total, deposit);

    await recordDepositPaid({
      id: b.id,
      total: b.total,
      deposit: b.deposit,
      checkIn: b.checkIn,
      paymentRef: b.paymentRef,
      listingId: b.listingId,
    });
    await recordRefund(b.id, b.deposit, "TEST-REFUND");

    const p = await prisma.payout.findUnique({ where: { bookingId: b.id } });
    expect(p!.status).toBe("cancelled"); // host ödənilmir

    const e = await prisma.ledgerEntry.findMany({ where: { bookingId: b.id } });
    const inSum = e.filter((x) => x.kind === "deposit_in").reduce((s, x) => s + x.amount, 0);
    const outSum = e
      .filter((x) => x.kind === "refund_out" || x.kind === "payout_out")
      .reduce((s, x) => s + x.amount, 0);
    expect(inSum).toBe(outSum); // netHeld = 0
  });
});

describe("markEligiblePayouts (Beh Qoruması)", () => {
  it("yalnız girişi ÇATMIŞ rezervin behini açır", async () => {
    const { total, deposit } = calcTotal(100, 3);
    const past = await makeBooking(new Date(Date.now() - 86_400_000), total, deposit);
    const future = await makeBooking(new Date(Date.now() + 7 * 86_400_000), total, deposit);

    for (const b of [past, future]) {
      await recordDepositPaid({
        id: b.id,
        total: b.total,
        deposit: b.deposit,
        checkIn: b.checkIn,
        paymentRef: b.paymentRef,
        listingId: b.listingId,
      });
    }

    await markEligiblePayouts();

    const pPast = await prisma.payout.findUnique({ where: { bookingId: past.id } });
    const pFuture = await prisma.payout.findUnique({ where: { bookingId: future.id } });
    expect(pPast!.status).toBe("eligible"); // qonaq girib → pul açılır
    expect(pFuture!.status).toBe("pending"); // hələ girməyib → escrow-da qalır
  });
});
