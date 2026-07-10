import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gecele.az";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const listing = await prisma.listing.findUnique({
    where: { slug: params.id },
    select: {
      title: true,
      region: true,
      type: true,
      pricePerNight: true,
      photo: true,
      status: true,
    },
  });
  if (!listing || listing.status !== "approved") {
    return { title: "Ev tapılmadı — Gecələ" };
  }
  const title = `${listing.title} — ${listing.region} | Gecələ`;
  const description = `${listing.region}-də ${listing.type.toLowerCase()} · gecəsi ${listing.pricePerNight} ₼-dən. Qorunan beh ilə onlayn rezervasiya.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/ev/${params.id}` },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "az_AZ",
      images: listing.photo ? [{ url: listing.photo }] : undefined,
    },
  };
}

export default async function ListingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const listing = await prisma.listing.findUnique({
    where: { slug: params.id },
    select: {
      title: true,
      region: true,
      type: true,
      pricePerNight: true,
      photo: true,
      rating: true,
      reviews: true,
      status: true,
    },
  });

  const jsonLd =
    listing && listing.status === "approved"
      ? {
          "@context": "https://schema.org",
          "@type": "LodgingBusiness",
          name: listing.title,
          image: listing.photo,
          address: {
            "@type": "PostalAddress",
            addressRegion: listing.region,
            addressCountry: "AZ",
          },
          priceRange: `${listing.pricePerNight} AZN`,
          ...(listing.reviews > 0
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: listing.rating,
                  reviewCount: listing.reviews,
                },
              }
            : {}),
        }
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      {children}
    </>
  );
}
