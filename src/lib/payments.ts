// Ödəniş şlüz abstraksiyası.
// PAYRIFF_MERCHANT_ID/PAYRIFF_SECRET_KEY boş olduqda TEST rejimi aktivdir:
// real pul hərəkəti yoxdur, axın tam simulyasiya olunur.
// Merchant hesabı açılan kimi env dəyərləri doldurulur — kod dəyişmir.

export interface ChargeInput {
  amountAzn: number;
  description: string;
  cardNumber: string;
  cardExpiry: string; // MM/YY
  cardCvv: string;
  bookingId?: string;
}

export interface ChargeResult {
  ok: boolean;
  ref: string;
  error?: string;
  redirectUrl?: string; // hosted checkout üçün (Payriff canlı rejim)
}

interface PaymentGateway {
  name: string;
  charge(input: ChargeInput): Promise<ChargeResult>;
  refund(ref: string, amountAzn: number): Promise<ChargeResult>;
}

const testGateway: PaymentGateway = {
  name: "test",
  async charge(input) {
    const digits = input.cardNumber.replace(/\s/g, "");
    if (!/^\d{16}$/.test(digits)) {
      return { ok: false, ref: "", error: "Kart nömrəsi 16 rəqəm olmalıdır" };
    }
    if (!/^\d{2}\/\d{2}$/.test(input.cardExpiry)) {
      return { ok: false, ref: "", error: "Bitmə tarixi AA/İİ formatında olmalıdır" };
    }
    if (!/^\d{3}$/.test(input.cardCvv)) {
      return { ok: false, ref: "", error: "CVV 3 rəqəm olmalıdır" };
    }
    // Test rejimində 0000 ilə bitən kart imtina ssenarisini yoxlamaq üçündür
    if (digits.endsWith("0000")) {
      return { ok: false, ref: "", error: "Bank ödənişi rədd etdi (test ssenarisi)" };
    }
    return { ok: true, ref: `TEST-${Date.now().toString(36).toUpperCase()}` };
  },
  async refund(ref) {
    // Test rejimində geri qaytarma həmişə uğurludur
    return { ok: true, ref: `TEST-REFUND-${ref}` };
  },
};

const PAYRIFF_BASE = "https://api.payriff.com/api/v3";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://gecele.az";
}

const payriffGateway: PaymentGateway = {
  name: "payriff",
  // Canlıda PCI tələbləri səbəbindən kart məlumatı serverdə emal olunmur —
  // istifadəçi Payriff hosted checkout səhifəsinə yönləndirilir, təsdiq
  // /api/payments/callback vasitəsilə gəlir.
  async charge(input) {
    try {
      const res = await fetch(`${PAYRIFF_BASE}/orders`, {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.PAYRIFF_SECRET_KEY ?? "",
        },
        body: JSON.stringify({
          merchantId: process.env.PAYRIFF_MERCHANT_ID,
          amount: input.amountAzn,
          currencyType: "AZN",
          description: input.description,
          language: "AZ",
          approveURL: `${siteUrl()}/api/payments/callback?booking=${input.bookingId ?? ""}`,
          cancelURL: `${siteUrl()}/odenis/${input.bookingId ?? ""}`,
          declineURL: `${siteUrl()}/odenis/${input.bookingId ?? ""}`,
        }),
      });
      const data = await res.json();
      const orderId = data?.payload?.orderId ?? data?.payload?.orderID ?? "";
      const url = data?.payload?.paymentUrl ?? data?.payload?.url ?? "";
      if (!url) {
        return { ok: false, ref: "", error: "Payriff sifarişi yaradıla bilmədi" };
      }
      // ok:false + redirectUrl → hələ ödənilməyib, yönləndirmə lazımdır
      return { ok: false, ref: String(orderId), redirectUrl: String(url) };
    } catch {
      return { ok: false, ref: "", error: "Ödəniş sistemi ilə əlaqə yaranmadı" };
    }
  },
  async refund(ref, amountAzn) {
    try {
      const res = await fetch(`${PAYRIFF_BASE}/refund`, {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.PAYRIFF_SECRET_KEY ?? "",
        },
        body: JSON.stringify({
          merchantId: process.env.PAYRIFF_MERCHANT_ID,
          orderId: ref,
          refundAmount: amountAzn,
        }),
      });
      const data = await res.json();
      const ok = data?.code === "00000" || data?.payload?.refund === true;
      return ok
        ? { ok: true, ref }
        : { ok: false, ref: "", error: "Geri qaytarma alınmadı" };
    } catch {
      return { ok: false, ref: "", error: "Geri qaytarma alınmadı" };
    }
  },
};

export function getGateway(): PaymentGateway {
  const live =
    process.env.PAYRIFF_MERCHANT_ID && process.env.PAYRIFF_SECRET_KEY;
  return live ? payriffGateway : testGateway;
}

export function isTestMode(): boolean {
  return getGateway().name === "test";
}
