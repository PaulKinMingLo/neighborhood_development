"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { DevelopmentApplication, NeighbourhoodGeoJSON } from "../types/development";

// Typed interfaces for Leaflet DOM objects
interface LeafletMapInstance {
  fitBounds(bounds: unknown, options?: unknown): void;
  flyTo(latLng: [number, number], zoom: number, options?: unknown): void;
  remove(): void;
  removeLayer(layer: unknown): void;
}

interface LeafletLayerGroup {
  clearLayers(): void;
  getBounds(): { isValid(): boolean };
  addTo(map: unknown): LeafletLayerGroup;
}

interface LeafletCircleMarkerInstance {
  bindPopup(content: string, options?: unknown): LeafletCircleMarkerInstance;
  on(event: string, fn: () => void): LeafletCircleMarkerInstance;
  addTo(group: unknown): LeafletCircleMarkerInstance;
  openPopup(): void;
}

interface LeafletGeoJSONInstance {
  addTo(map: unknown): LeafletGeoJSONInstance;
  resetStyle(layer: unknown): void;
}

interface LeafletPathTarget {
  setStyle(style: { weight?: number; color?: string; fillOpacity?: number }): void;
}

interface LeafletGlobal {
  map(element: HTMLElement, options?: Record<string, unknown>): LeafletMapInstance;
  control: {
    zoom(options?: { position: string }): { addTo(map: unknown): void };
  };
  tileLayer(url: string, options?: Record<string, unknown>): { addTo(map: unknown): void };
  featureGroup(): LeafletLayerGroup;
  circleMarker(
    latLng: [number, number],
    options?: Record<string, unknown>
  ): LeafletCircleMarkerInstance;
  geoJSON(geojson: unknown, options?: Record<string, unknown>): LeafletGeoJSONInstance;
}

declare global {
  interface Window {
    L: LeafletGlobal;
  }
}

interface MapComponentProps {
  applications: DevelopmentApplication[];
  selectedApp: DevelopmentApplication | null;
  onSelectApp: (app: DevelopmentApplication) => void;
}

export default function MapComponent({
  applications,
  selectedApp,
  onSelectApp,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null);
  const markersGroupRef = useRef<LeafletLayerGroup | null>(null);
  const geojsonLayerRef = useRef<LeafletGeoJSONInstance | null>(null);
  const markersMapRef = useRef<Map<number, LeafletCircleMarkerInstance>>(new Map());
  const neighbourhoodCacheRef = useRef<NeighbourhoodGeoJSON | null>(null);

  const [isLeafletReady, setIsLeafletReady] = useState<boolean>(
    () => typeof window !== "undefined" && Boolean(window.L)
  );
  const [showNeighbourhoods, setShowNeighbourhoods] = useState(false);
  const [isLoadingNeighbourhoods, setIsLoadingNeighbourhoods] = useState(false);

  // 1. Dynamically load Leaflet CSS & JS from CDN
  useEffect(() => {
    if (typeof window === "undefined" || window.L) return;

    // Add CSS
    const linkId = "leaflet-stylesheet";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      link.crossOrigin = "";
      document.head.appendChild(link);
    }

    // Add JS
    const scriptId = "leaflet-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
      script.crossOrigin = "";
      script.onload = () => {
        setIsLeafletReady(true);
      };
      document.body.appendChild(script);
    } else {
      const checkL = setInterval(() => {
        if (window.L) {
          setIsLeafletReady(true);
          clearInterval(checkL);
        }
      }, 50);
      return () => clearInterval(checkL);
    }
  }, []);

  // Status-based color mapping
  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("review") || s.includes("received")) return "#2563eb"; // Blue
    if (s.includes("approved") || s.includes("permit")) return "#16a34a"; // Green
    if (s.includes("hearing") || s.includes("meeting")) return "#d97706"; // Amber
    if (s.includes("refused") || s.includes("withdrawn")) return "#dc2626"; // Red
    if (s.includes("closed")) return "#64748b"; // Slate
    return "#8b5cf6"; // Violet
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "OZ":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "SA":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "MV":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "CD":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!isLeafletReady || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map(mapContainerRef.current, {
      center: [43.68, -79.38],
      zoom: 12,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Toronto Open Data',
      maxZoom: 19,
    }).addTo(map);

    markersGroupRef.current = L.featureGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isLeafletReady]);

  // 3. Render Application Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !markersGroupRef.current) return;

    const L = window.L;
    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();
    markersMapRef.current.clear();

    const validApps = applications.filter(
      (app) => app.latitude !== null && app.longitude !== null
    );

    validApps.forEach((app) => {
      const isSelected = selectedApp?.id === app.id;
      const color = getStatusColor(app.status);

      const marker = L.circleMarker([app.latitude as number, app.longitude as number], {
        radius: isSelected ? 10 : 7,
        fillColor: color,
        color: "#ffffff",
        weight: isSelected ? 3 : 1.5,
        opacity: 1,
        fillOpacity: 0.9,
      });

      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; min-width: 220px; max-width: 280px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; color: #334155;">
              ${app.applicationType}
            </span>
            <span style="font-size: 11px; color: ${color}; font-weight: 600;">
              ${app.status}
            </span>
          </div>
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.3;">
            ${app.address}
          </h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">
            ${app.wardName ? `${app.wardName} (${app.applicationNumber})` : app.applicationNumber}
            ${app.dateSubmitted ? ` &bull; 📅 ${new Date(app.dateSubmitted).toLocaleDateString("en-CA")}` : ""}
          </p>
          <p style="margin: 0 0 8px 0; font-size: 11px; color: #334155; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
            ${app.description || "No description provided."}
          </p>
          ${
            app.applicationUrl
              ? `<a href="${app.applicationUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; font-size: 11px; color: #2563eb; font-weight: 600; text-decoration: none;">
                  View City Details &rarr;
                </a>`
              : ""
          }
        </div>
      `;

      marker.bindPopup(popupHtml, { closeButton: false, offset: [0, -4] });

      marker.on("click", () => {
        onSelectApp(app);
      });

      marker.addTo(markersGroup);
      markersMapRef.current.set(app.id, marker);
    });

    if (validApps.length > 0 && !selectedApp) {
      try {
        const bounds = markersGroup.getBounds();
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }
      } catch (e) {
        console.warn("Could not fit map bounds:", e);
      }
    }
  }, [applications, isLeafletReady, onSelectApp, selectedApp]);

  // 4. Center map and open popup when selectedApp changes
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedApp) return;

    if (selectedApp.latitude !== null && selectedApp.longitude !== null) {
      mapInstanceRef.current.flyTo(
        [selectedApp.latitude, selectedApp.longitude],
        15,
        { duration: 0.8 }
      );

      const marker = markersMapRef.current.get(selectedApp.id);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedApp]);

  // 5. Toggle Toronto Neighbourhoods Boundary Layer
  const toggleNeighbourhoods = useCallback(async () => {
    if (!mapInstanceRef.current || !window.L) return;

    const map = mapInstanceRef.current;
    const L = window.L;

    if (showNeighbourhoods) {
      if (geojsonLayerRef.current) {
        map.removeLayer(geojsonLayerRef.current);
        geojsonLayerRef.current = null;
      }
      setShowNeighbourhoods(false);
      return;
    }

    setIsLoadingNeighbourhoods(true);

    try {
      if (!neighbourhoodCacheRef.current) {
        const res = await fetch("/api/neighbourhoods");
        if (!res.ok) throw new Error("Failed to fetch neighbourhoods");
        const data: NeighbourhoodGeoJSON = await res.json();
        neighbourhoodCacheRef.current = data;
      }

      const cached = neighbourhoodCacheRef.current;
      if (cached && cached.features) {
        if (geojsonLayerRef.current) {
          map.removeLayer(geojsonLayerRef.current);
        }

        // Clone to avoid mutating cached object when Leaflet registers internal IDs
        const geojsonPayload = JSON.parse(JSON.stringify(cached));

        const layer = L.geoJSON(geojsonPayload, {
          style: {
            color: "#0284c7",
            weight: 1.5,
            opacity: 0.7,
            fillColor: "#38bdf8",
            fillOpacity: 0.08,
          },
          onEachFeature: (
            feature: { properties?: Record<string, unknown> },
            fLayer: {
              bindTooltip(text: string, options: unknown): void;
              on(events: Record<string, (e: { target: LeafletPathTarget }) => void>): void;
            }
          ) => {
            const name =
              (feature.properties?.AREA_NAME as string) ||
              (feature.properties?.AREA_S_CD as string) ||
              (feature.properties?.name as string) ||
              "Neighbourhood";

            fLayer.bindTooltip(name, {
              sticky: true,
              className: "neighbourhood-tooltip",
              direction: "top",
            });

            fLayer.on({
              mouseover: (e) => {
                e.target.setStyle({
                  weight: 2.5,
                  color: "#0369a1",
                  fillOpacity: 0.22,
                });
              },
              mouseout: (e) => {
                layer.resetStyle(e.target);
              },
            });
          },
        });

        layer.addTo(map);
        geojsonLayerRef.current = layer;
        setShowNeighbourhoods(true);
      }
    } catch (err) {
      console.error("Error loading neighbourhoods GeoJSON layer:", err);
    } finally {
      setIsLoadingNeighbourhoods(false);
    }
  }, [showNeighbourhoods]);

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Loading state indicator before Leaflet is ready */}
      {!isLeafletReady && (
        <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center gap-3 z-10">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading Geospatial Map Canvas...</p>
        </div>
      )}

      {/* Floating Map Controls & Overlays */}
      {isLeafletReady && (
        <div className="absolute top-4 right-4 z-400 flex flex-col gap-2">
          {/* Neighbourhoods GeoJSON Boundary Toggle Button */}
          <button
            onClick={toggleNeighbourhoods}
            disabled={isLoadingNeighbourhoods}
            className={`px-3 py-2 rounded-lg text-xs font-semibold shadow-md backdrop-blur border transition-all flex items-center gap-2 ${
              showNeighbourhoods
                ? "bg-blue-600 text-white border-blue-700 shadow-blue-500/20"
                : "bg-white/95 text-slate-700 hover:bg-slate-50 border-slate-200"
            }`}
          >
            <span>🗺️</span>
            <span>
              {isLoadingNeighbourhoods
                ? "Loading Boundaries..."
                : showNeighbourhoods
                ? "Hide Neighbourhoods"
                : "Show 158 Neighbourhoods"}
            </span>
          </button>

          {/* Map Legend */}
          <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-lg p-3 shadow-md text-xs text-slate-700 space-y-1.5">
            <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 mb-1">
              Application Status
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
              <span>Under Review / Received</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
              <span>Approved / Permit</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
              <span>Hearing / Consultation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-500 shrink-0" />
              <span>Closed / Other</span>
            </div>
          </div>
        </div>
      )}

      {/* Selected Application Bottom Detail Card */}
      {selectedApp && (
        <div className="absolute bottom-6 left-6 right-6 md:left-6 md:right-auto md:max-w-md bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-200/80 z-400 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span
                className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getTypeBadgeColor(
                  selectedApp.applicationType
                )}`}
              >
                {selectedApp.applicationType} &bull; {selectedApp.applicationNumber}
              </span>
              <h3 className="font-bold text-slate-900 text-sm mt-1 leading-snug">
                {selectedApp.address}
              </h3>
            </div>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
              style={{
                color: getStatusColor(selectedApp.status),
                backgroundColor: `${getStatusColor(selectedApp.status)}18`,
              }}
            >
              {selectedApp.status}
            </span>
          </div>

          <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
            {selectedApp.description || "No description provided."}
          </p>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <div>
              <span className="font-medium text-slate-700">Ward:</span>{" "}
              {selectedApp.wardName || "Toronto"}
            </div>
            {selectedApp.dateSubmitted && (
              <div>
                <span className="font-medium text-slate-700">Submitted:</span>{" "}
                {new Date(selectedApp.dateSubmitted).toLocaleDateString("en-CA")}
              </div>
            )}
            {selectedApp.plannerName && (
              <div>
                <span className="font-medium text-slate-700">Planner:</span>{" "}
                {selectedApp.plannerName}
              </div>
            )}
            {selectedApp.applicationUrl && (
              <a
                href={selectedApp.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-semibold hover:underline flex items-center gap-0.5"
              >
                City Portal &rarr;
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
