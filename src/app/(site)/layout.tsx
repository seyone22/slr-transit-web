import React from "react";
import Navigation from "@/components/Navigation";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
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
    </div>
  );
}
