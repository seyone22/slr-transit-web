import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SLR Transit Hub - Sri Lanka Railways GTFS Platform",
  description: "Official Sri Lanka Railways GTFS transit data explorer, live delay feeds, transfer schedule finder, and interactive network map.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <Navigation />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 sm:px-6">
            <p>SLR Transit Platform. Built to standardize and open Sri Lanka's rail transit data.</p>
            <p className="mt-1">All real-time schedules are simulated based on dispatcher updates.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
