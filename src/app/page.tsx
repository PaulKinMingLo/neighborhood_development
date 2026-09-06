import { getDevelopmentData } from "@/api/getDevelopmentData";
import TrackerDashboard from "@/components/TrackerDashboard";

export const revalidate = 1800; // Revalidate every 30 minutes

export default async function Home() {
  const applications = await getDevelopmentData({ limit: 150 });

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50">
      {/* Global Application Header */}
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            📍
          </div>
          <div>
            <h1 className="text-base md:text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
              Toronto Development Applications Tracker
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Geospatial planning monitor powered by City of Toronto Open Data (CKAN)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-medium text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Open Data Live Sync</span>
          </div>

          <a
            href="https://open.toronto.ca/dataset/development-applications/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors"
          >
            Data Portal ↗
          </a>
        </div>
      </header>

      {/* Interactive Dashboard Container */}
      <TrackerDashboard initialData={applications} />
    </main>
  );
}
