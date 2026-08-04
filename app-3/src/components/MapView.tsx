import { useEffect, useRef } from "react";

import type { LatLngExpression, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

import { cn } from "@/lib/cn";

export type MapMarker = {
  readonly label: string;
  readonly position: LatLngExpression;
};

export type MapViewProps = {
  readonly center: LatLngExpression;
  readonly className?: string;
  readonly markers?: readonly MapMarker[];
  readonly tileUrl?: string;
  readonly zoom?: number;
};

const defaultTileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export const MapView = ({
  center,
  className,
  markers = [],
  tileUrl = defaultTileUrl,
  zoom = 12,
}: MapViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let isDisposed = false;
    let map: LeafletMap | null = null;
    const container = containerRef.current;

    void import("leaflet").then((leaflet) => {
      if (isDisposed) return;

      const createdMap = leaflet.map(container).setView(center, zoom);
      map = createdMap;
      leaflet
        .tileLayer(tileUrl, {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        })
        .addTo(createdMap);
      markers.forEach((marker) => {
        leaflet
          .marker(marker.position)
          .addTo(createdMap)
          .bindPopup(marker.label);
      });
      window.requestAnimationFrame(() => map?.invalidateSize());
    });

    return () => {
      isDisposed = true;
      map?.remove();
    };
  }, [center, markers, tileUrl, zoom]);

  return (
    <div
      aria-label="Interactive map"
      className={cn(
        "h-72 w-full overflow-hidden rounded-3xl border border-border/70 bg-muted shadow-sm shadow-foreground/5",
        className,
      )}
      ref={containerRef}
      role="region"
    />
  );
};
