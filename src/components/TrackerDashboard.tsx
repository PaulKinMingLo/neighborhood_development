"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { DevelopmentApplication } from "../types/development";

// Dynamically import MapComponent to disable SSR for Leaflet/DOM operations
const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex flex-col items-center justify-center bg-slate-100 text-slate-500">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
      <p className="text-sm font-medium">Initializing Map Canvas...</p>
    </div>
  ),
});

interface DashboardProps {
  initialData: DevelopmentApplication[];
}

export default function TrackerDashboard({ initialData }: DashboardProps) {
  const [applications] = useState<DevelopmentApplication[]>(initialData);
  const [selectedApp, setSelectedApp] = useState<DevelopmentApplication | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedWard, setSelectedWard] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [mobileTab, setMobileTab] = useState<"list" | "map">("list");
  const [detailModalApp, setDetailModalApp] = useState<DevelopmentApplication | null>(null);

  // Extract unique Wards from data
  const availableWards = useMemo(() => {
    const wardsSet = new Set<string>();
    applications.forEach((app) => {
      if (app.wardName) wardsSet.add(app.wardName);
    });
    return Array.from(wardsSet).sort();
  }, [applications]);

  // Extract unique Application Types
  const availableTypes = useMemo(() => {
    const typesSet = new Set<string>();
    applications.forEach((app) => {
      if (app.applicationType) typesSet.add(app.applicationType);
    });
    return Array.from(typesSet).sort();
  }, [applications]);

  // Extract unique Submitted Years from data
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    applications.forEach((app) => {
      if (app.dateSubmitted) {
        const match = app.dateSubmitted.match(/^(\d{4})/);
        const year = match
          ? match[1]
          : (!isNaN(new Date(app.dateSubmitted).getTime())
          ? new Date(app.dateSubmitted).getFullYear().toString()
          : null);
        if (year) yearsSet.add(year);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [applications]);

  // Filter application list
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      // Search term matching
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesAddress = app.address.toLowerCase().includes(query);
        const matchesType = app.applicationType.toLowerCase().includes(query);
        const matchesDesc = app.description.toLowerCase().includes(query);
        const matchesWard = app.wardName.toLowerCase().includes(query);
        const matchesNumber = app.applicationNumber.toLowerCase().includes(query);

        if (!matchesAddress && !matchesType && !matchesDesc && !matchesWard && !matchesNumber) {
          return false;
        }
      }

      // Type filter
      if (selectedType !== "ALL" && app.applicationType !== selectedType) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "ALL") {
        const statusLower = app.status.toLowerCase();
        if (selectedStatus === "OPEN" && statusLower.includes("closed")) return false;
        if (selectedStatus === "CLOSED" && !statusLower.includes("closed")) return false;
        if (selectedStatus === "REVIEW" && !statusLower.includes("review") && !statusLower.includes("received")) return false;
        if (selectedStatus === "APPROVED" && !statusLower.includes("approved") && !statusLower.includes("permit")) return false;
      }

      // Ward filter
      if (selectedWard !== "ALL" && app.wardName !== selectedWard) {
        return false;
      }

      // Year filter (submitted date)
      if (selectedYear !== "ALL") {
        if (!app.dateSubmitted) return false;
        const match = app.dateSubmitted.match(/^(\d{4})/);
        const appYear = match
          ? match[1]
          : (!isNaN(new Date(app.dateSubmitted).getTime())
          ? new Date(app.dateSubmitted).getFullYear().toString()
          : null);
        if (appYear !== selectedYear) {
          return false;
        }
      }

      return true;
    });
  }, [applications, searchTerm, selectedType, selectedStatus, selectedWard, selectedYear]);

  // Status badge styling helper
  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("review") || s.includes("received")) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    if (s.includes("approved") || s.includes("permit")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (s.includes("hearing") || s.includes("meeting")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (s.includes("closed")) {
      return "bg-slate-100 text-slate-600 border-slate-200";
    }
    return "bg-purple-50 text-purple-700 border-purple-200";
  };

  const handleSelectApp = (app: DevelopmentApplication) => {
    setSelectedApp(app);
    // On mobile, automatically switch to map view when an application is tapped
    if (window.innerWidth < 768) {
      setMobileTab("map");
    }
  };

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-4rem)] overflow-hidden">
      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex border-b bg-white">
        <button
          onClick={() => setMobileTab("list")}
          className={`flex-1 py-2.5 text-center text-xs font-semibold border-b-2 transition-colors ${
            mobileTab === "list"
              ? "border-blue-600 text-blue-600 bg-blue-50/50"
              : "border-transparent text-slate-600"
          }`}
        >
          📋 Applications List ({filteredApps.length})
        </button>
        <button
          onClick={() => setMobileTab("map")}
          className={`flex-1 py-2.5 text-center text-xs font-semibold border-b-2 transition-colors ${
            mobileTab === "map"
              ? "border-blue-600 text-blue-600 bg-blue-50/50"
              : "border-transparent text-slate-600"
          }`}
        >
          🗺️ Interactive Map
        </button>
      </div>

      <div className="flex flex-1 h-full overflow-hidden">
        {/* LEFT PANEL: Filters & Feed List */}
        <div
          className={`${
            mobileTab === "list" ? "flex" : "hidden"
          } md:flex w-full md:w-[460px] border-r bg-white flex-col h-full shrink-0 shadow-sm z-10`}
        >
          {/* Search & Filters Header */}
          <div className="p-4 border-b bg-slate-50/70 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search address, type, ward, keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs md:text-sm border border-slate-200 rounded-lg bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Type Filter */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full py-1.5 px-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
                >
                  <option value="ALL">All Types</option>
                  {availableTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full py-1.5 px-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
                >
                  <option value="ALL">All Status</option>
                  <option value="REVIEW">Under Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="OPEN">All Open</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              {/* Ward Filter */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Ward
                </label>
                <select
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="w-full py-1.5 px-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
                >
                  <option value="ALL">All Wards</option>
                  {availableWards.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Submitted Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full py-1.5 px-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
                >
                  <option value="ALL">All Years</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Counter and Active Filters summary */}
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-0.5 pt-1">
              <span>
                Showing <strong className="text-slate-800">{filteredApps.length}</strong> of{" "}
                {applications.length} applications
              </span>
              {(searchTerm ||
                selectedType !== "ALL" ||
                selectedStatus !== "ALL" ||
                selectedWard !== "ALL" ||
                selectedYear !== "ALL") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedType("ALL");
                    setSelectedStatus("ALL");
                    setSelectedWard("ALL");
                    setSelectedYear("ALL");
                  }}
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium underline"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Feed List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredApps.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm space-y-2">
                <div className="text-3xl">🏙️</div>
                <p className="font-medium text-slate-600">No applications match your criteria</p>
                <p className="text-xs">Try loosening your search keywords or filter selections.</p>
              </div>
            ) : (
              filteredApps.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                return (
                  <div
                    key={app.id}
                    onClick={() => handleSelectApp(app)}
                    className={`p-4 text-left cursor-pointer transition-all duration-150 ease-in-out hover:bg-slate-50/80 ${
                      isSelected
                        ? "bg-blue-50/80 border-l-4 border-blue-600 pl-3 shadow-xs"
                        : "border-l-4 border-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {app.applicationType}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {app.applicationNumber}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${getStatusBadge(
                          app.status
                        )}`}
                      >
                        {app.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug">
                      {app.address}
                    </h3>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                      <span>📍 {app.wardName || "Toronto"}</span>
                      {app.dateSubmitted && (
                        <span>
                          📅 {new Date(app.dateSubmitted).toLocaleDateString("en-CA")}
                        </span>
                      )}
                      {app.latitude && app.longitude && (
                        <span className="text-emerald-600 font-medium">● Mapped</span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
                      {app.description || "No description provided."}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-slate-100/80">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailModalApp(app);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium text-[11px] flex items-center gap-1 hover:underline"
                      >
                        <span>Inspect Details</span> &rarr;
                      </button>
                      {app.applicationUrl && (
                        <a
                          href={app.applicationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-400 hover:text-slate-700 text-[11px] hover:underline"
                        >
                          City AIC ↗
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Map Container */}
        <div
          className={`${
            mobileTab === "map" ? "flex" : "hidden"
          } md:flex flex-1 bg-slate-100 relative h-full`}
        >
          <MapComponent
            applications={filteredApps}
            selectedApp={selectedApp}
            onSelectApp={(app) => setSelectedApp(app)}
          />
        </div>
      </div>

      {/* Full Details Modal */}
      {detailModalApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider mb-1">
                  {detailModalApp.applicationType} &bull; {detailModalApp.applicationNumber}
                </span>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  {detailModalApp.address}
                </h2>
                <div className="text-xs text-slate-500 mt-1">
                  {detailModalApp.wardName} &bull; Postal: {detailModalApp.postal || "N/A"}
                </div>
              </div>
              <button
                onClick={() => setDetailModalApp(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto py-4 space-y-4 text-xs md:text-sm text-slate-700">
              <div>
                <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider text-slate-400 mb-1">
                  Status & Date
                </h4>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusBadge(
                      detailModalApp.status
                    )}`}
                  >
                    {detailModalApp.status}
                  </span>
                  {detailModalApp.dateSubmitted && (
                    <span className="text-slate-600 text-xs">
                      Submitted on:{" "}
                      <strong>
                        {new Date(detailModalApp.dateSubmitted).toLocaleDateString("en-CA", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </strong>
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-1">
                  Project Description
                </h4>
                <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-700 leading-relaxed">
                  {detailModalApp.description || "No official description provided."}
                </p>
              </div>

              {/* Community Consultation Info */}
              {(detailModalApp.meetingDate || detailModalApp.meetingLocation) && (
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-1">
                  <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                    <span>🗓️</span> Community Meeting / Consultation
                  </h4>
                  {detailModalApp.meetingDate && (
                    <p className="text-xs text-amber-800">
                      Date: {new Date(detailModalApp.meetingDate).toLocaleDateString("en-CA")}
                      {detailModalApp.meetingTime ? ` at ${detailModalApp.meetingTime}` : ""}
                    </p>
                  )}
                  {detailModalApp.meetingLocation && (
                    <p className="text-xs text-amber-800">
                      Location: {detailModalApp.meetingLocation}
                    </p>
                  )}
                </div>
              )}

              {/* City Planner Contact */}
              {detailModalApp.plannerName && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span>👤</span> Assigned City Planner
                  </h4>
                  <p className="text-xs text-slate-700 font-medium">{detailModalApp.plannerName}</p>
                  <div className="flex flex-wrap gap-3 pt-1 text-xs text-slate-600">
                    {detailModalApp.plannerPhone && <span>📞 {detailModalApp.plannerPhone}</span>}
                    {detailModalApp.plannerEmail && (
                      <a
                        href={`mailto:${detailModalApp.plannerEmail}`}
                        className="text-blue-600 hover:underline"
                      >
                        ✉️ {detailModalApp.plannerEmail}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Geospatial Coordinates */}
              <div>
                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-1">
                  Geospatial Coordinates
                </h4>
                <div className="font-mono text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex justify-between">
                  <span>
                    Lat/Lng: {detailModalApp.latitude ?? "N/A"},{" "}
                    {detailModalApp.longitude ?? "N/A"}
                  </span>
                  <span>MTM10: {detailModalApp.x || "N/A"}, {detailModalApp.y || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedApp(detailModalApp);
                  setDetailModalApp(null);
                  if (window.innerWidth < 768) {
                    setMobileTab("map");
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <span>Focus on Map</span> 🎯
              </button>

              {detailModalApp.applicationUrl && (
                <a
                  href={detailModalApp.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <span>Open City AIC Portal</span> ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}