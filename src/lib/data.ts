// Paylaşılan tiplər və sabitlər — API DTO-ları ilə üst-üstə düşür.

export const REGIONS = [
  "Qəbələ",
  "Quba",
  "İsmayıllı",
  "Şahdağ",
  "Nabran",
  "Lənkəran",
  "Abşeron",
  "Göygöl",
] as const;

export type Region = (typeof REGIONS)[number];

// Filtr üçün kanonik dəyərlər — seed-dəki ev tiplərini və ən çox rast gəlinən
// imkanları əhatə edir. Filtr paneli bu siyahılardan qurulur.
export const PROPERTY_TYPES = [
  "Villa",
  "Bağ evi",
  "Dağ evi",
  "Həyət evi",
  "Kotec",
  "Şale",
] as const;

export const FILTER_AMENITIES = [
  "Wi-Fi",
  "Hovuz",
  "Manqal",
  "Kamin",
  "Parkinq",
  "Sauna",
  "Terras",
] as const;

// Qiymət diapazonu üçün hüdudlar (gecəlik, ₼)
export const PRICE_MIN = 20;
export const PRICE_MAX = 500;

export interface ReviewDto {
  guestName: string;
  rating: number;
  text: string;
  date: string;
}

export interface ListingDto {
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
  amenities: string[];
  hostName: string;
  photo: string;
  photos?: string[];
  lat?: number;
  lng?: number;
  bookedRanges?: { checkIn: string; checkOut: string }[];
  reviewList?: ReviewDto[];
  // Sosial sübut / çevirmə siqnalları (yalnız elan səhifəsində gəlir)
  previousPrice?: number | null;
  isSuperhost?: boolean;
  viewsLast24h?: number;
  bookingsLast30d?: number;
  lastBookedDaysAgo?: number | null;
}

export interface BookingDto {
  id: string;
  code: string;
  title: string;
  region: string;
  photo: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  deposit: number;
  status: string;
}

export const SERVICE_FEE_RATE = 0.05;
export const DEPOSIT_RATE = 0.2;

export function calcTotal(pricePerNight: number, nights: number) {
  const base = pricePerNight * nights;
  const fee = Math.round(base * SERVICE_FEE_RATE);
  return {
    base,
    fee,
    total: base + fee,
    deposit: Math.round((base + fee) * DEPOSIT_RATE),
  };
}

// Bölgə mərkəzləri (təxmini) — xəritə və koordinat fallback-ı üçün
export const REGION_CENTERS: Record<string, [number, number]> = {
  Qəbələ: [40.9983, 47.8474],
  Quba: [41.3608, 48.5128],
  İsmayıllı: [40.7897, 48.1517],
  Şahdağ: [41.32, 48.11],
  Nabran: [41.55, 48.63],
  Lənkəran: [38.7529, 48.8508],
  Abşeron: [40.39, 49.89],
  Göygöl: [40.5892, 46.32],
};

// Koordinat yoxdursa: bölgə mərkəzi + determinstik kiçik ofset (üst-üstə düşməsin)
export function coordsFor(region: string, seed: string): [number, number] {
  const [clat, clng] = REGION_CENTERS[region] ?? [40.4, 49.8];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const dLat = ((h % 1000) / 1000 - 0.5) * 0.09;
  const dLng = (((h >> 10) % 1000) / 1000 - 0.5) * 0.09;
  return [clat + dLat, clng + dLng];
}
