import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toronto Development Tracker | Open Data Geospatial Monitor",
  description:
    "Interactive geospatial visualization of City of Toronto development applications across neighbourhoods using Open Data Toronto CKAN API.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
