// İlkin elan datası. Fotolar Unsplash-dan (kommersiya istifadəsinə açıq lisenziya).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const u = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=75`;

// Qalereya üçün interyer fotoları
const INTERIORS = [
  u("photo-1522708323590-d24dbb6b0267"),
  u("photo-1502672260266-1c1ef2d93688"),
  u("photo-1560448204-e02f11c3d0e2"),
  u("photo-1484154218962-a197022b5858"),
  u("photo-1505693416388-ac5ce068fe85"),
];

const CENTERS = {
  "Qəbələ": [40.9983, 47.8474],
  "Quba": [41.3608, 48.5128],
  "İsmayıllı": [40.7897, 48.1517],
  "Şahdağ": [41.32, 48.11],
  "Nabran": [41.55, 48.63],
  "Lənkəran": [38.7529, 48.8508],
  "Abşeron": [40.39, 49.89],
  "Göygöl": [40.5892, 46.32],
};

const listings = [
  {
    slug: "qebele-cay-evi",
    title: "Çay kənarında taxta ev",
    region: "Qəbələ",
    type: "Dağ evi",
    pricePerNight: 140,
    rating: 4.9,
    reviews: 87,
    maxGuests: 6,
    bedrooms: 3,
    pool: false,
    amenities: ["Manqal", "Wi-Fi", "Kamin", "Çay kənarı", "Parkinq"],
    hostName: "Elşən",
    photo: u("photo-1449158743715-0a90ebb6d2d8"),
  },
  {
    slug: "duruca-villa",
    title: "Duruca Villa",
    region: "Qəbələ",
    type: "Villa",
    pricePerNight: 320,
    rating: 4.8,
    reviews: 64,
    maxGuests: 10,
    bedrooms: 5,
    pool: true,
    amenities: ["Hovuz", "Manqal", "Wi-Fi", "Sauna", "Bilyard", "Parkinq"],
    hostName: "Nigar",
    photo: u("photo-1512917774080-9991f1c4c750"),
  },
  {
    slug: "qebele-mese-kotec",
    title: "Meşə içində kotec",
    region: "Qəbələ",
    type: "Kotec",
    pricePerNight: 180,
    rating: 4.7,
    reviews: 41,
    maxGuests: 4,
    bedrooms: 2,
    pool: false,
    amenities: ["Kamin", "Wi-Fi", "Terras", "Manqal"],
    hostName: "Rəşad",
    photo: u("photo-1518780664697-55e3ad937233"),
  },
  {
    slug: "qecres-alma-bagi",
    title: "Alma bağlı həyət evi",
    region: "Quba",
    type: "Həyət evi",
    pricePerNight: 90,
    rating: 4.6,
    reviews: 53,
    maxGuests: 8,
    bedrooms: 3,
    pool: false,
    amenities: ["Meyvə bağı", "Manqal", "Samovar", "Parkinq"],
    hostName: "Zaur",
    photo: u("photo-1464226184884-fa280b87c399"),
  },
  {
    slug: "qecres-sam-mesesi",
    title: "Qəçrəş şam meşəsi evi",
    region: "Quba",
    type: "Dağ evi",
    pricePerNight: 150,
    rating: 4.8,
    reviews: 72,
    maxGuests: 6,
    bedrooms: 3,
    pool: false,
    amenities: ["Şam meşəsi", "Kamin", "Wi-Fi", "Manqal"],
    hostName: "Aysel",
    photo: u("photo-1441974231531-c6227db76b6e"),
  },
  {
    slug: "lahic-das-evi",
    title: "Lahıc daş evi",
    region: "İsmayıllı",
    type: "Həyət evi",
    pricePerNight: 75,
    rating: 4.9,
    reviews: 96,
    maxGuests: 4,
    bedrooms: 2,
    pool: false,
    amenities: ["Tarixi məhəllə", "Dağ mənzərəsi", "Çay dəsti"],
    hostName: "Fərid",
    photo: u("photo-1523217582562-09d0def993a6"),
  },
  {
    slug: "ismayilli-dag-kotec",
    title: "Dağ mənzərəli kotec",
    region: "İsmayıllı",
    type: "Kotec",
    pricePerNight: 130,
    rating: 4.7,
    reviews: 38,
    maxGuests: 5,
    bedrooms: 2,
    pool: false,
    amenities: ["Panorama terras", "Manqal", "Wi-Fi"],
    hostName: "Günel",
    photo: u("photo-1506905925346-21bda4d32df4"),
  },
  {
    slug: "sahdag-sale",
    title: "Şahdağ şalesi",
    region: "Şahdağ",
    type: "Şale",
    pricePerNight: 280,
    rating: 4.8,
    reviews: 45,
    maxGuests: 8,
    bedrooms: 4,
    pool: false,
    amenities: ["Pistə 5 dəq", "Kamin", "Sauna", "Wi-Fi", "Parkinq"],
    hostName: "Emil",
    photo: u("photo-1520250497591-112f2f40a3f4"),
  },
  {
    slug: "nabran-deniz-evi",
    title: "Dəniz kənarı bağ evi",
    region: "Nabran",
    type: "Bağ evi",
    pricePerNight: 120,
    rating: 4.5,
    reviews: 61,
    maxGuests: 6,
    bedrooms: 3,
    pool: false,
    amenities: ["Dənizə 300 m", "Manqal", "Həmək", "Parkinq"],
    hostName: "Kamran",
    photo: u("photo-1499793983690-e29da59ef1c2"),
  },
  {
    slug: "nabran-hovuzlu-villa",
    title: "Nabran villası",
    region: "Nabran",
    type: "Villa",
    pricePerNight: 250,
    rating: 4.7,
    reviews: 33,
    maxGuests: 12,
    bedrooms: 5,
    pool: true,
    amenities: ["Hovuz", "Manqal", "Səs sistemi", "Wi-Fi", "Parkinq"],
    hostName: "Ləman",
    photo: u("photo-1613490493576-7fde63acd811"),
  },
  {
    slug: "lenkeran-cay-evi",
    title: "Çay plantasiyası qonaq evi",
    region: "Lənkəran",
    type: "Həyət evi",
    pricePerNight: 85,
    rating: 4.8,
    reviews: 29,
    maxGuests: 5,
    bedrooms: 2,
    pool: false,
    amenities: ["Çay bağı", "Səhər yeməyi", "Samovar"],
    hostName: "Səbinə",
    photo: u("photo-1587061949409-02df41d5e562"),
  },
  {
    slug: "novxani-hovuzlu-bag",
    title: "Novxanı hovuzlu bağ",
    region: "Abşeron",
    type: "Bağ evi",
    pricePerNight: 200,
    rating: 4.6,
    reviews: 58,
    maxGuests: 10,
    bedrooms: 4,
    pool: true,
    amenities: ["Hovuz", "Manqal", "Toğana", "Parkinq"],
    hostName: "Orxan",
    photo: u("photo-1613977257363-707ba9348227"),
  },
  {
    slug: "merdekan-bag-evi",
    title: "Mərdəkan bağ evi",
    region: "Abşeron",
    type: "Bağ evi",
    pricePerNight: 110,
    rating: 0,
    reviews: 0,
    maxGuests: 8,
    bedrooms: 3,
    pool: false,
    amenities: ["Üzüm çardağı", "Manqal", "Parkinq"],
    hostName: "Tural",
    photo: u("photo-1564013799919-ab600027ffc6"),
  },
  {
    slug: "goygol-panorama",
    title: "Göygöl panorama evi",
    region: "Göygöl",
    type: "Dağ evi",
    pricePerNight: 160,
    rating: 4.9,
    reviews: 24,
    maxGuests: 6,
    bedrooms: 3,
    pool: false,
    amenities: ["Göl mənzərəsi", "Kamin", "Manqal", "Wi-Fi"],
    hostName: "Vüsal",
    photo: u("photo-1470770841072-f978cf4d019e"),
  },
];

// Nümunə rəylər — real istifadədə Review API kodla yoxlayıb yazır
const seedReviews = [
  { slug: "qebele-cay-evi", code: "SEED-Q1", guestName: "Aysel", rating: 5, text: "Ev şəkillərdəkindən də yaxşı idi. Çayın səsi ilə yatmaq əvəzsizdir." },
  { slug: "qebele-cay-evi", code: "SEED-Q2", guestName: "Rauf", rating: 5, text: "Ailəvi istirahət üçün ideal. Manqal yeri geniş, ev sahibi çox diqqətlidir." },
  { slug: "duruca-villa", code: "SEED-D1", guestName: "Ləman", rating: 5, text: "Hovuz tərtəmiz, uşaqlar çox məmnun qaldı. Mütləq qayıdacağıq." },
  { slug: "duruca-villa", code: "SEED-D2", guestName: "Elvin", rating: 4, text: "Villa geniş və rahatdır. Sauna əla işləyirdi, tövsiyə edirəm." },
  { slug: "lahic-das-evi", code: "SEED-L1", guestName: "Nərmin", rating: 5, text: "Lahıcın ortasında əsl tarixi ev təcrübəsi. Səhər mənzərəsi möhtəşəmdir." },
  { slug: "lahic-das-evi", code: "SEED-L2", guestName: "Tərlan", rating: 5, text: "Ev sahibi çayla qarşıladı, hər şey təsvirə tam uyğun idi." },
  { slug: "qecres-sam-mesesi", code: "SEED-S1", guestName: "Cavid", rating: 5, text: "Şam meşəsinin içində sakitlik axtarana ideal yerdir." },
  { slug: "sahdag-sale", code: "SEED-SH1", guestName: "Aynur", rating: 5, text: "Pistə həqiqətən 5 dəqiqədir. Kamin axşamları əvəzsiz idi." },
  { slug: "lenkeran-cay-evi", code: "SEED-LN1", guestName: "Orxan", rating: 5, text: "Səhər yeməyi ev sahibindən — çay bağına baxa-baxa. Unudulmaz." },
];

async function main() {
  for (let i = 0; i < listings.length; i++) {
    const l = listings[i];
    const photos = JSON.stringify([
      l.photo,
      INTERIORS[i % INTERIORS.length],
      INTERIORS[(i + 2) % INTERIORS.length],
    ]);
    const [clat, clng] = CENTERS[l.region] ?? [40.4, 49.8];
    const lat = clat + (((i % 5) - 2) * 0.02);
    const lng = clng + ((((i * 3) % 5) - 2) * 0.02);
    const data = { ...l, amenities: JSON.stringify(l.amenities), photos, lat, lng };
    await prisma.listing.upsert({
      where: { slug: l.slug },
      update: data,
      create: data,
    });
  }

  for (const r of seedReviews) {
    const listing = await prisma.listing.findUnique({
      where: { slug: r.slug },
      select: { id: true },
    });
    if (!listing) continue;
    await prisma.review.upsert({
      where: { bookingCode: r.code },
      update: {},
      create: {
        listingId: listing.id,
        bookingCode: r.code,
        guestName: r.guestName,
        rating: r.rating,
        text: r.text,
      },
    });
  }

  const count = await prisma.listing.count();
  const reviews = await prisma.review.count();
  console.log(`Seed tamam: ${count} elan, ${reviews} rəy.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
