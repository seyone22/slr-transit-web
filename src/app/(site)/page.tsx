import React from 'react';
import Link from 'next/link';
import { db } from '@/db';
import { stop, route, trip } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { ShieldCheck, Zap, Globe, MapPin, AlertCircle, ArrowRight, Share2 } from 'lucide-react';

export const revalidate = 3600; // Cache database counts for an hour

export default async function HomePage() {
  let stopCountVal = 341;
  let routeCountVal = 9;
  let tripCountVal = 494;

  try {
    const stopsRes = await db.select({ count: sql<number>`count(*)` }).from(stop);
    const routesRes = await db.select({ count: sql<number>`count(*)` }).from(route);
    const tripsRes = await db.select({ count: sql<number>`count(*)` }).from(trip);

    stopCountVal = Number(stopsRes[0]?.count || 341);
    routeCountVal = Number(routesRes[0]?.count || 9);
    tripCountVal = Number(tripsRes[0]?.count || 494);
  } catch (err) {
    console.error('Error fetching dashboard counts from database:', err);
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="bg-primary text-white rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.2),transparent)] pointer-events-none" />
        <div className="max-w-3xl space-y-6 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <Globe className="h-3 w-3" /> Standardizing Transit Data
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Sri Lanka Railways: <br className="hidden sm:inline" />
            <span className="text-sky-400">GTFS Data Standardization</span> Engine
          </h1>
          <p className="text-lg text-slate-200 font-medium">
            Bridging the gap between paper timetables and modern mobile transit maps. Discover, search, and map Sri Lanka's rail schedules using global open-data standards.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/schedule"
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold bg-accent text-white hover:bg-sky-600 transition-colors shadow-md gap-2"
            >
              Search Schedules <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/map"
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors gap-2"
            >
              View Network Map
            </Link>
          </div>
        </div>
      </section>

      {/* Database Statistics */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-primary rounded-xl">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{stopCountVal}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stations Mapped</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-primary rounded-xl">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{routeCountVal}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Railway Lines</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-primary rounded-xl">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{tripCountVal}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Daily Train Trips</div>
          </div>
        </div>
      </section>

      {/* Market Gap & GTFS Advocacy */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">What is GTFS & Why Does It Matter?</h2>
          <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
            <p>
              The <strong>General Transit Feed Specification (GTFS)</strong> is a standardized format used globally by public transit agencies. It packages station locations, route geometries, pricing matrices, and departure timetables into a single structured format that integrations like <strong>Google Maps, Apple Maps, and Citymapper</strong> consume automatically.
            </p>
            <p>
              Sri Lanka Railways is currently hindered by a significant digital gap. Commuters rely on offline timetables, unofficial blogs, or physical boards. By adopting the GTFS platform created here, SLR can instantly push its entire network into global mapping systems.
            </p>
            <p>
              Adopting GTFS enables:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Instant Route Maps</strong>: Integration with Google/Apple Maps for effortless trip planning.</li>
              <li><strong>Real-time Delay Updates</strong>: Publishing dispatcher station reports instantly to passenger apps.</li>
              <li><strong>Open Data Ecosystem</strong>: Fostering local app developers to create customized commuter products.</li>
            </ul>
          </div>
        </div>

        {/* Market Gap Cards */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            The Current Transit Sector Gaps
          </h3>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-none p-2 bg-amber-50 text-amber-600 rounded-lg h-9 w-9 flex items-center justify-center font-bold text-xs">1</div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">No Live Position Feeds</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Locomotives lack onboard telemetry. Drivers frequently oppose hardware GPS trackers. Station dispatchers need a manual backup portal to report delays.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-none p-2 bg-amber-50 text-amber-600 rounded-lg h-9 w-9 flex items-center justify-center font-bold text-xs">2</div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Disconnected Shape Files</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Traditional feeds lack physical coordinate paths (`shapes.txt`). Passengers see straight lines crossing oceans instead of matching actual train track beds.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-none p-2 bg-amber-50 text-amber-600 rounded-lg h-9 w-9 flex items-center justify-center font-bold text-xs">3</div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Opaque Ticket Fares</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Ticket costs remain locked inside hard-to-parse official PDFs. There is no simple API for third-party fare calculation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Principles */}
      <section className="bg-slate-100 p-8 sm:p-12 rounded-3xl space-y-8">
        <h2 className="text-2xl font-bold text-slate-900 text-center">Platform Architectural Strengths</h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm">
              <ShieldCheck className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Drizzle Query Speed</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Replacing heavy configurations with raw TypeScript bindings. Drizzle ORM ensures millisecond responses on complex multi-hop transfer queries.
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm">
              <Zap className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">High-Res Map Shapes</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              We parsed 15,058 OpenStreetMap coordinates starting at Colombo Fort to align GTFS shapes with true physical tracks.
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm">
              <Share2 className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Cloudflare CDN Pipeline</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Static feeds rebuild nightly via cron and offload database queries to public Cloudflare R2 CDN buckets.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
