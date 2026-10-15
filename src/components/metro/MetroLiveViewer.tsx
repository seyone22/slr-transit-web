'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Bus,
  Radio,
  RefreshCw,
  Sun,
  Moon,
  Layers,
  MapPin,
  Compass,
  Gauge,
  Users,
  X,
  Info,
  CheckCircle2,
  Maximize2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import networkData from '@/data/lmt-metro-network.json';
import { LiveBus, RouteCorridor, StopPoint } from './MetroMapInner';
import '@/app/metro/metro.css';

// Dynamic import of Leaflet map to disable SSR
const MetroMapInner = dynamic(() => import('./MetroMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#0b0f19] flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
        <Bus className="w-7 h-7 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-white font-bold tracking-tight text-base">
          Initializing LMT Telemetry Canvas...
        </h3>
        <p className="text-slate-400 text-xs font-mono">
          Loading 7 CM Corridors & GPS Feed
        </p>
      </div>
    </div>
  ),
});

export default function MetroLiveViewer() {
  const [buses, setBuses] = useState<LiveBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(5);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedCorridor, setSelectedCorridor] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<LiveBus | null>(null);
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('dark');
  const [showStops, setShowStops] = useState(false);
  const [showBadges, setShowBadges] = useState(true);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [showBriefing, setShowBriefing] = useState(false);

  const routes: RouteCorridor[] = useMemo(() => networkData.routes as any, []);
  const stops: StopPoint[] = useMemo(() => networkData.stops as any, []);

  // Fetch live bus telemetry
  const fetchLiveBuses = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/metro/vehicles', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.buses)) {
          setBuses(data.buses);
          setLastUpdated(new Date());

          // Keep selected bus updated with fresh GPS coordinates
          if (selectedBus) {
            const updated = data.buses.find(
              (b: LiveBus) => b.trip_id === selectedBus.trip_id
            );
            if (updated) setSelectedBus(updated);
          }
        }
      }
    } catch (err) {
      console.error('Failed to sync live buses:', err);
    } finally {
      setIsSyncing(false);
      setLoading(false);
      setCountdown(5);
    }
  }, [selectedBus]);

  // Initial load
  useEffect(() => {
    fetchLiveBuses();
  }, []);

  // 5-second polling interval with 1-second countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchLiveBuses();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchLiveBuses]);

  // Aggregate KPI stats
  const stats = useMemo(() => {
    const totalActive = buses.length;
    const totalFreeSeats = buses.reduce((acc, b) => acc + (b.available_seats || 0), 0);
    const avgSpeed =
      buses.length > 0
        ? Math.round(
            (buses.reduce((acc, b) => acc + (b.speed || 0), 0) / buses.length) * 10
          ) / 10
        : 0;

    // Bus count by corridor
    const byCorridor: Record<string, number> = {};
    routes.forEach((r) => (byCorridor[r.code] = 0));
    buses.forEach((b) => {
      if (byCorridor[b.route_code] !== undefined) {
        byCorridor[b.route_code]++;
      }
    });

    return { totalActive, totalFreeSeats, avgSpeed, byCorridor };
  }, [buses, routes]);

  const activeRouteObj = useMemo(() => {
    if (!selectedBus) return null;
    return routes.find((r) => r.code === selectedBus.route_code) || null;
  }, [selectedBus, routes]);

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-[#0b0f19] select-none font-sans text-slate-100">
      {/* 1. Leaflet Interactive Canvas */}
      <MetroMapInner
        routes={routes}
        stops={stops}
        buses={buses}
        selectedCorridor={selectedCorridor}
        selectedBus={selectedBus}
        onSelectBus={setSelectedBus}
        onSelectCorridor={setSelectedCorridor}
        showStops={showStops}
        showBadges={showBadges}
        mapTheme={mapTheme}
        recenterTrigger={recenterTrigger}
      />

      {/* 2. Top Floating Glassmorphic Command Bar */}
      <header className="absolute top-4 inset-x-4 z-[500] pointer-events-none flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Branding & Live Ping */}
        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
            <Bus className="w-5 h-5 text-white" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-sm sm:text-base">
                Lanka Metro Transit
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                LMT-METRO
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-[11px] text-emerald-400">
                LIVE TELEMETRY
              </span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-[10px] text-slate-300">
                Sync {isSyncing ? '...' : `in ${countdown}s`}
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right KPIs & Quick Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {/* Key Stat Badges (Visible on iPad / Desktop) */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-xl font-mono text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5">
              <Bus className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">Active Fleet:</span>
              <span className="font-bold text-white text-sm">
                {stats.totalActive}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Seats Free:</span>
              <span className="font-bold text-emerald-400 text-sm">
                {stats.totalFreeSeats.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Speed:</span>
              <span className="font-bold text-white text-sm">
                {stats.avgSpeed} km/h
              </span>
            </div>
          </div>

          {/* Action Tools */}
          <div className="bg-slate-900/85 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-xl flex items-center gap-1">
            {/* Recenter Map */}
            <button
              onClick={() => setRecenterTrigger((n) => n + 1)}
              title="Recenter to active fleet"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Toggle Badges */}
            <button
              onClick={() => setShowBadges(!showBadges)}
              title="Toggle Seat Availability Badges"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                showBadges
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:bg-white/10'
              }`}
            >
              <span>Seats</span>
            </button>

            {/* Toggle Stops */}
            <button
              onClick={() => setShowStops(!showStops)}
              title="Toggle 220 Station Stops"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                showStops
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:bg-white/10'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Stops</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setMapTheme(mapTheme === 'dark' ? 'light' : 'dark')}
              title="Toggle Dark / Light Basemap"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              {mapTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-300" />
              ) : (
                <Moon className="w-4 h-4 text-slate-300" />
              )}
            </button>

            {/* Refresh Now */}
            <button
              onClick={fetchLiveBuses}
              disabled={isSyncing}
              title="Force Refresh Feed"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`}
              />
            </button>

            {/* Briefing Modal */}
            <button
              onClick={() => setShowBriefing(true)}
              title="Project Overview & Briefing"
              className="ml-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-1 shadow-lg shadow-blue-500/25 transition"
            >
              <Info className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Executive Brief</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Floating 7 CM Corridor Filter Pill Bar (BusRouter / TransitLens Style) */}
      <nav className="absolute top-20 sm:top-20 inset-x-4 z-[450] pointer-events-none flex justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none">
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1.5 max-w-full overflow-x-auto">
          {/* ALL Corridors Pill */}
          <button
            onClick={() => setSelectedCorridor(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              selectedCorridor === null
                ? 'bg-white text-slate-900 shadow-md font-extrabold'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <span>All Corridors</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedCorridor === null
                  ? 'bg-slate-900 text-white'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              {buses.length}
            </span>
          </button>

          <div className="w-[1px] h-4 bg-white/15 mx-0.5" />

          {/* 7 CM Corridors */}
          {routes.map((r) => {
            const count = stats.byCorridor[r.code] || 0;
            const isSelected = selectedCorridor === r.code;

            return (
              <button
                key={r.code}
                onClick={() =>
                  setSelectedCorridor(isSelected ? null : r.code)
                }
                style={{
                  borderColor: isSelected ? r.color : 'transparent',
                  backgroundColor: isSelected ? `${r.color}25` : undefined,
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border whitespace-nowrap ${
                  isSelected
                    ? 'text-white shadow-lg'
                    : 'text-slate-300 hover:bg-white/10 border-transparent'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: r.color }}
                />
                <span>{r.code}</span>
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-mono"
                  style={{
                    backgroundColor: isSelected ? r.color : 'rgba(255,255,255,0.1)',
                    color: isSelected ? r.textColor : '#cbd5e1',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 4. Selected Bus Telemetry Inspector Card (Sliding Glass Sheet) */}
      {selectedBus && (
        <aside className="absolute bottom-6 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-96 z-[500] pointer-events-auto bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  backgroundColor: activeRouteObj?.color || '#10b981',
                }}
              >
                <Bus
                  className="w-6 h-6"
                  style={{ color: activeRouteObj?.textColor || '#ffffff' }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white tracking-tight">
                    {selectedBus.license_plate}
                  </h3>
                  <span
                    className="px-2 py-0.5 text-[10px] font-black rounded-md font-mono"
                    style={{
                      backgroundColor: activeRouteObj?.color || '#10b981',
                      color: activeRouteObj?.textColor || '#ffffff',
                    }}
                  >
                    {selectedBus.route_code}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">
                  {activeRouteObj?.name || 'Express Corridor'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedBus(null)}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Seat Availability Hero Block */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Live Seat Availability
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full font-mono ${
                  selectedBus.available_seats > 20
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : selectedBus.available_seats > 5
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {selectedBus.occupancy_status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Gauge Number */}
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white font-mono tracking-tight">
                  {selectedBus.available_seats}
                </span>
                <span className="text-slate-400 text-sm font-semibold">
                  / {selectedBus.capacity_total} free seats
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {selectedBus.capacity_current} onboard
              </span>
            </div>

            {/* Visual Occupancy Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  selectedBus.available_seats > 20
                    ? 'bg-emerald-400'
                    : selectedBus.available_seats > 5
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(5, selectedBus.occupancy_pct))}%`,
                }}
              />
            </div>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Gauge className="w-3.5 h-3.5 text-blue-400" />
                <span>Ground Speed</span>
              </div>
              <p className="text-base font-bold text-white font-mono mt-1">
                {selectedBus.speed} <span className="text-xs font-normal">km/h</span>
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Compass className="w-3.5 h-3.5 text-purple-400" />
                <span>Compass Bearing</span>
              </div>
              <p className="text-base font-bold text-white font-mono mt-1">
                {selectedBus.bearing}°
              </p>
            </div>
          </div>

          {/* Timestamp Footer */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/10">
            <span>Trip ID:</span>
            <span className="font-mono text-slate-300 truncate max-w-[200px]">
              {selectedBus.trip_id}
            </span>
          </div>
        </aside>
      )}

      {/* 5. Bottom Quick Corridor Legend & Summary Pills */}
      <footer className="absolute bottom-6 left-6 z-[450] pointer-events-none hidden md:flex items-center gap-3">
        <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl px-3.5 py-2 shadow-xl flex items-center gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
            <span>&gt;20 Seats Free</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400"></span>
            <span>1-20 Seats Free</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-sm shadow-rose-400"></span>
            <span>Standing Only / Full</span>
          </div>
        </div>
      </footer>

      {/* 6. Executive Briefing Modal for Government Officials */}
      {showBriefing && (
        <div className="fixed inset-0 z-[1000] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-200 space-y-6 animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowBriefing(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Bus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  LMT Metro Fleet Telemetry Platform
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  SLR & LMT Intelligent Transit Operations (GTFS-RT v2.0)
                </p>
              </div>
            </div>

            {/* Core Value Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-white text-sm">5-Second Cadence</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time GPS updates directly from 70+ commercial buses operating across the 7 CM corridors.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-white text-sm">Seat Crowding Engine</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Passenger count sensors feed live seat availability (&quot;31/70 free&quot;) before the vehicle reaches your platform.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-white text-sm">GTFS-RT Standard</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Conforms strictly to Google Maps, Apple Maps, and Transit App specifications for instant global public display.
                </p>
              </div>
            </div>

            {/* Corridors Overview Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Network Corridors Covered
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium">
                {routes.map((r) => (
                  <div
                    key={r.code}
                    className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: r.color }}
                    />
                    <span className="font-bold text-white font-mono">{r.code}:</span>
                    <span className="text-slate-300 truncate">{r.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer action */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowBriefing(false)}
                className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-200 transition shadow-lg"
              >
                Return to Live Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
