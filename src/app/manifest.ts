import type { MetadataRoute } from "next";

// PWA manifesti — App Store / Play Market planı üçün "əlavə et" təcrübəsi.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gecələ — istirahət evləri",
    short_name: "Gecələ",
    description:
      "Azərbaycanda bağ evləri, villalar və dağ evləri. Qorunan beh ilə onlayn rezervasiya.",
    id: "/",
    scope: "/",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#E31C5F",
    lang: "az",
    dir: "ltr",
    categories: ["travel", "lifestyle"],
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
    ],
  };
}
