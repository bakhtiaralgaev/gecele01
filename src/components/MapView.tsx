"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";

export interface MapPoint {
  id: string;
  slug: string;
  title: string;
  region: string;
  pricePerNight: number;
  rating: number;
  reviews: number;
  photo: string;
  lat: number;
  lng: number;
}

// Leaflet popup-u innerHTML ilə qurur — ev sahibinin yazdığı mətn escape olunmalıdır.
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeImageUrl(u: string): string {
  return /^https:\/\//i.test(u) || u.startsWith("/") ? esc(u) : "";
}

export default function MapView({
  points,
  variant = "home",
  className = "",
}: {
  points: MapPoint[];
  variant?: "home" | "single";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      // Marker clustering — yaxın elanlar üst-üstə düşməsin
      await import("leaflet.markercluster");
      if (cancelled || !ref.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(ref.current, {
          scrollWheelZoom: variant === "home",
          zoomControl: true,
        });
        // Açıq, minimal bazaxəritə (Airbnb üslubu) — açar tələb etmir
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          {
            subdomains: "abcd",
            maxZoom: 20,
            detectRetina: true,
            attribution: "&copy; OpenStreetMap &copy; CARTO",
          }
        ).addTo(mapRef.current);

        layerRef.current =
          variant === "home"
            ? L.markerClusterGroup({
                showCoverageOnHover: false,
                spiderfyOnMaxZoom: true,
                maxClusterRadius: 48,
                disableClusteringAtZoom: 13,
                chunkedLoading: true,
                iconCreateFunction: (cluster) =>
                  L.divIcon({
                    html: `<div class="gc-cluster">${cluster.getChildCount()}</div>`,
                    className: "",
                    iconSize: [1, 1],
                  }),
              }).addTo(mapRef.current)
            : L.layerGroup().addTo(mapRef.current);
      }
      const map = mapRef.current;
      const group = layerRef.current!;
      group.clearLayers();

      if (variant === "home") map.scrollWheelZoom.enable();
      else map.scrollWheelZoom.disable();

      const valid = points.filter(
        (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)
      );
      if (valid.length === 0) {
        map.setView([40.6, 48.5], 7);
        return;
      }

      const bounds: [number, number][] = [];
      for (const p of valid) {
        bounds.push([p.lat, p.lng]);
        if (variant === "home") {
          const price = esc(String(p.pricePerNight));
          const icon = L.divIcon({
            className: "",
            html: `<div class="gc-pin">${price} ₼</div>`,
            iconSize: [1, 1],
          });
          const marker = L.marker([p.lat, p.lng], { icon }).addTo(group);
          const badge = p.reviews > 0 ? `★ ${p.rating.toFixed(1)}` : "Yeni";
          const img = safeImageUrl(p.photo);
          marker.bindPopup(
            `<a href="/ev/${encodeURIComponent(p.slug)}" class="gc-pop">` +
              (img ? `<img src="${img}" alt=""/>` : "") +
              `<span class="gc-pop-b">` +
              `<span class="gc-pop-t">${esc(p.region)} — ${esc(p.title)}</span>` +
              `<span class="gc-pop-m">${badge} · ${price} ₼ / gecə</span>` +
              `</span></a>`
          );
        } else {
          L.circle([p.lat, p.lng], {
            radius: 850,
            color: "#E31C5F",
            fillColor: "#E31C5F",
            fillOpacity: 0.12,
            weight: 1.5,
          }).addTo(group);
        }
      }

      if (variant === "single") {
        map.setView(bounds[0], 12);
      } else if (valid.length === 1) {
        map.setView(bounds[0], 11);
      } else {
        map.fitBounds(bounds, { padding: [55, 55], maxZoom: 12 });
      }

      timer = setTimeout(() => mapRef.current?.invalidateSize(), 120);
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [points, variant]);

  // Unmount: xəritəni tam sil
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  return <div ref={ref} className={className} />;
}
