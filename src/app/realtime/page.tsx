import React from 'react';
import { Activity, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface TripUpdate {
  trip_id: string;
  delay: number; // in seconds
  timestamp: string;
  updated_at: string;
}

interface Alert {
  id: string;
  header_text: string;
  description: string;
  cause?: string;
  effect?: string;
}

async function getRealtimeData() {
  const apiBaseUrl = process.env.API_BASE_URL || 'https://slr-transit-server-production.up.railway.app/api/v1';
  try {
    const [updatesRes, alertsRes] = await Promise.all([
      fetch(`${apiBaseUrl}/realtime/trip-updates/list`, { next: { revalidate: 10 } }),
      fetch(`${apiBaseUrl}/realtime/alerts/list`, { next: { revalidate: 10 } }),
    ]);

    const updates = updatesRes.ok ? await updatesRes.json() : [];
    const alerts = alertsRes.ok ? await alertsRes.json() : [];

    return { updates, alerts, isFallback: false };
  } catch (err) {
    console.warn('Backend API is offline or unreachable. Falling back to simulated/mock realtime updates:', err);
    
    // Resilient fallback data
    const mockUpdates: TripUpdate[] = [
      { trip_id: 'TR_70', delay: 300, timestamp: new Date().toISOString(), updated_at: new Date().toISOString() },
      { trip_id: 'TR_78', delay: 600, timestamp: new Date().toISOString(), updated_at: new Date().toISOString() },
      { trip_id: 'TR_82', delay: 180, timestamp: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    const mockAlerts: Alert[] = [
      { id: 'AL_01', header_text: 'Coastal Line Speed Restriction', description: 'Due to heavy monsoon track maintenance between Colombo Fort and Mount Lavinia, trains may experience minor delays.', cause: 'MAINTENANCE', effect: 'OTHER_EFFECT' }
    ];
    return { updates: mockUpdates, alerts: mockAlerts, isFallback: true };
  }
}

export default async function RealtimePage() {
  const { updates, alerts, isFallback } = await getRealtimeData();

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-8 w-8 text-accent animate-pulse" />
            Live Delay updates & Alerts
          </h1>
          <p className="text-slate-500 text-sm">
            Live delays reported manually by station dispatchers, synchronized with GTFS-RT feeders.
          </p>
        </div>
        {isFallback && (
          <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="h-3.5 w-3.5" /> Backend Offline (Simulated Feeds)
          </span>
        )}
      </div>

      {/* Grid Dashboard */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Live Delays Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="h-5 w-5 text-accent" /> Active Trip Delays
            </h3>

            {updates.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No active train delays reported. All systems running on schedule.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {updates.map((update: TripUpdate, i: number) => {
                  const minutes = Math.floor(update.delay / 60);
                  const seconds = update.delay % 60;
                  return (
                    <div key={i} className="flex justify-between items-center py-4 first:pt-0 last:pb-0">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Trip ID: {update.trip_id}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Updated: {new Date(update.updated_at).toLocaleTimeString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        minutes >= 10 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        +{minutes}m {seconds > 0 ? `${seconds}s` : ''} delay
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Live Alerts Panel */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2 border-b border-slate-100 pb-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Service Alerts
            </h3>

            {alerts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No active service alerts or line delays reported.</p>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert: Alert, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 space-y-2">
                    <h4 className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      {alert.header_text}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{alert.description}</p>
                    {alert.cause && (
                      <div className="pt-2 text-[10px] text-slate-400 flex gap-3 uppercase font-semibold">
                        <span>Cause: {alert.cause.replace('_', ' ')}</span>
                        {alert.effect && <span>Effect: {alert.effect.replace('_', ' ')}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
