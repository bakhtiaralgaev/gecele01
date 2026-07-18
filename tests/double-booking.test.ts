import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

// Bu testlər BAZANIN qaydasını yoxlayır, tətbiq məntiqini yox.
// Qəsdən bookings/route.ts-i tamamilə yan keçib birbaşa yazırıq — yəni
// kodda baq olsa, hətta yoxlama tamamilə silinsə belə, bazanın ikiqat
// rezervasiyaya icazə vermədiyini sübut edir.

const D = (s: string) => new Date(`${s}T12:00:00Z`);

function makeListing(slug: string) {
  return prisma.listing.create({
    data: {
      slug,
      title: "Test evi",
      region: "Qəbələ",
      type: "villa",
      pricePerNight: 100,
      maxGuests: 4,
      bedrooms: 2,
      amenities: "[]",
      hostName: "Test",
      photo: "/test.jpg",
    },
  });
}

function makeBooking(
  listingId: string,
  code: string,
  checkIn: string,
  checkOut: string,
  status: string
) {
  return prisma.booking.create({
    data: {
      listingId,
      code,
      checkIn: D(checkIn),
      checkOut: D(checkOut),
      guests: 2,
      guestName: "Test Qonaq",
      guestPhone: "+994501112233",
      total: 300,
      deposit: 60,
      status,
    },
  });
}

describe("ikiqat rezervasiya — baza səviyyəsində qadağa", () => {
  it("üst-üstə düşən iki CONFIRMED rezerv yazıla BİLMİR", async () => {
    const l = await makeListing("dbl-ust-uste");
    await makeBooking(l.id, "GCL-DBL01", "2027-08-10", "2027-08-15", "confirmed");

    // 12–18 avqust, birincisi 10–15 → 12–15 kəsişir
    await expect(
      makeBooking(l.id, "GCL-DBL02", "2027-08-12", "2027-08-18", "confirmed")
    ).rejects.toThrow();
  });

  it("tam eyni tarixlər də yazıla BİLMİR", async () => {
    const l = await makeListing("dbl-eyni");
    await makeBooking(l.id, "GCL-DBL03", "2027-08-10", "2027-08-15", "confirmed");

    await expect(
      makeBooking(l.id, "GCL-DBL04", "2027-08-10", "2027-08-15", "confirmed")
    ).rejects.toThrow();
  });

  it("bitişik tarixlər İCAZƏLİDİR (çıxış günü = növbəti giriş)", async () => {
    const l = await makeListing("dbl-bitisik");
    await makeBooking(l.id, "GCL-DBL05", "2027-09-01", "2027-09-05", "confirmed");

    // Qayda çox sərt olmamalıdır — 5-i çıxan qonaqdan sonra ev boşdur
    const next = await makeBooking(
      l.id,
      "GCL-DBL06",
      "2027-09-05",
      "2027-09-09",
      "confirmed"
    );
    expect(next.id).toBeTruthy();
  });

  it("fərqli evlərdə eyni tarix İCAZƏLİDİR", async () => {
    const a = await makeListing("dbl-ev-a");
    const b = await makeListing("dbl-ev-b");
    await makeBooking(a.id, "GCL-DBL07", "2027-10-01", "2027-10-05", "confirmed");

    const other = await makeBooking(
      b.id,
      "GCL-DBL08",
      "2027-10-01",
      "2027-10-05",
      "confirmed"
    );
    expect(other.id).toBeTruthy();
  });

  it("PENDING rezervlər bazada bloklanmır — onları tətbiq idarə edir", async () => {
    const l = await makeListing("dbl-pending");
    await makeBooking(l.id, "GCL-DBL09", "2027-11-01", "2027-11-05", "pending");

    // Qayda qəsdən yalnız `confirmed`-ə baxır: partial index-in WHERE şərti
    // IMMUTABLE olmalıdır, ona görə "vaxtı bitməmiş pending" ifadə edilə bilmir.
    // Vaxtı keçmiş pending tarixi əbədi tutmasın deyə bu, doğru seçimdir.
    const second = await makeBooking(
      l.id,
      "GCL-DBL10",
      "2027-11-02",
      "2027-11-06",
      "pending"
    );
    expect(second.id).toBeTruthy();
  });
});
