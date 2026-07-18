import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET as bookingsGET } from "@/app/api/bookings/route";
import { PATCH as bookingPATCH } from "@/app/api/bookings/[id]/route";
import { GET as callbackGET } from "@/app/api/payments/callback/route";

// Bu testlər 2026-07-16-da tapılan üç kritik deşiyin REQRESSİYA qorumasıdır.
// Hər biri o vaxt canlıda idi. Bir daha qayıtmasın.

const VICTIM_PHONE = "+994509998877";
let listingId = "";
let bookingId = "";

beforeAll(async () => {
  const listing = await prisma.listing.create({
    data: {
      slug: `sec-test-${Date.now()}`,
      title: "Test evi",
      region: "Qəbələ",
      type: "Villa",
      pricePerNight: 100,
      maxGuests: 4,
      bedrooms: 2,
      amenities: "[]",
      hostName: "Test Host",
      photo: "https://example.com/x.jpg",
      status: "approved",
    },
  });
  listingId = listing.id;

  // Anonim (hesabsız) rezerv — qurbanın rezervi
  const booking = await prisma.booking.create({
    data: {
      listingId,
      checkIn: new Date("2027-08-01T12:00:00Z"),
      checkOut: new Date("2027-08-04T12:00:00Z"),
      guests: 2,
      guestName: "Qurban",
      guestPhone: VICTIM_PHONE,
      total: 315,
      deposit: 63,
      code: `GCL-SEC${Date.now().toString(36).slice(-2).toUpperCase()}`,
      status: "pending",
      expiresAt: new Date(Date.now() + 15 * 60_000),
    },
  });
  bookingId = booking.id;
});

afterAll(async () => {
  await prisma.ledgerEntry.deleteMany({ where: { bookingId } });
  await prisma.payout.deleteMany({ where: { bookingId } });
  await prisma.booking.deleteMany({ where: { listingId } });
  await prisma.listing.deleteMany({ where: { id: listingId } });
  await prisma.$disconnect();
});

describe("Telefon-IDOR", () => {
  it("sessiyasız ?phone= ilə başqasının rezervlərini OXUMAQ olmaz", async () => {
    const req = new NextRequest(
      `http://localhost/api/bookings?phone=${encodeURIComponent(VICTIM_PHONE)}`
    );
    const res = await bookingsGET(req);
    expect(res.status).toBe(401);
  });

  it("sessiyasız /api/bookings ümumiyyətlə 401 verir", async () => {
    const res = await bookingsGET(new NextRequest("http://localhost/api/bookings"));
    expect(res.status).toBe(401);
  });
});

describe("Telefonla ləğv", () => {
  it("gövdədəki telefon sahiblik SÜBUTU deyil — ləğv olunmur", async () => {
    const req = new NextRequest(`http://localhost/api/bookings/${bookingId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "cancel", phone: VICTIM_PHONE }),
    });
    const res = await bookingPATCH(req, { params: { id: bookingId } });
    expect(res.status).toBe(401);

    const after = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(after?.status).toBe("pending"); // ləğv OLUNMAYIB
  });
});

describe("Ödənişsiz təsdiq (callback)", () => {
  it("paymentRef yoxdursa callback rezervi təsdiqləmir", async () => {
    const req = new NextRequest(
      `http://localhost/api/payments/callback?booking=${bookingId}`
    );
    await callbackGET(req);

    const after = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(after?.status).toBe("pending");
    expect(after?.paidAt).toBeNull();
  });

  it("paymentRef VAR olsa da şlüz 'ödənilib' demədikcə təsdiq YOXDUR", async () => {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { paymentRef: "FAKE-ORDER-123" },
    });

    const req = new NextRequest(
      `http://localhost/api/payments/callback?booking=${bookingId}`
    );
    await callbackGET(req);

    const after = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(after?.status).toBe("pending"); // fail-closed
    expect(after?.paidAt).toBeNull();

    // Və pulsuz payout/ledger yaranmayıb
    const payout = await prisma.payout.findUnique({ where: { bookingId } });
    expect(payout).toBeNull();
  });
});
