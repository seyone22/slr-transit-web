'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { StationData, ShapeData, TimetableEntry, getStationTimetable } from '@/app/map/actions';
import { Clock, Train, X } from 'lucide-react';

interface MapComponentProps {
  stops: StationData[];
  shapes: ShapeData[];
}

// Fit map to SLR bounds on mount
function MapBoundsSetter({ stops }: { stops: StationData[] }) {
  const map = useMap();
  useEffect(() => {
    if (stops.length > 0) {
      const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lon]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [stops, map]);
  return null;
}

export default function MapComponent({ stops, shapes }: MapComponentProps) {
  const [selectedStop, setSelectedStop] = useState<StationData | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);

  // Fetch timetable on station selection
  useEffect(() => {
    if (selectedStop) {
      setLoadingTimetable(true);
      getStationTimetable(selectedStop.id)
        .then(data => {
          setTimetable(data);
          setLoadingTimetable(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingTimetable(false);
        });
    }
  }, [selectedStop]);

  // Color mapping for different track shape segments to represent lines
  const getRouteColor = (shapeId: string) => {
    if (shapeId.includes('main')) return '#1e3a8a';  // Deep Blue
    if (shapeId.includes('coast')) return '#0ea5e9'; // Cyan
    if (shapeId.includes('putt')) return '#10b981';  // Emerald Green
    if (shapeId.includes('batt')) return '#f59e0b';  // Amber
    if (shapeId.includes('trin')) return '#8b5cf6';  // Violet
    return '#475569'; // Slate fallback
  };

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col md:flex-row">
      
      {/* Map Container */}
      <div className="flex-1 h-full relative z-10">
        <MapContainer
          center={[6.93, 79.85]} // Default Colombo Fort
          zoom={9}
          className="w-full h-full"
        >
          {/* CartoDB Positron tile layer for high premium clean aesthetics */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* Draw Track Polylines */}
          {shapes.map((shape, i) => (
            <Polyline
              key={i}
              positions={shape.points.map(p => [p.lat, p.lon] as [number, number])}
              pathOptions={{
                color: getRouteColor(shape.shapeId),
                weight: 4,
                opacity: 0.85
              }}
            />
          ))}

          {/* Draw Station Circles */}
          {stops.map((stop) => (
            <CircleMarker
              key={stop.id}
              center={[stop.lat, stop.lon]}
              radius={6}
              pathOptions={{
                color: '#ffffff',
                fillColor: '#0f172a',
                fillOpacity: 1,
                weight: 2
              }}
              eventHandlers={{
                click: () => setSelectedStop(stop),
              }}
            >
              <Popup>
                <div className="text-center font-bold text-slate-800 text-xs py-0.5">
                  {stop.name}
                </div>
              </Popup>
            </CircleMarker>
          ))}

          <MapBoundsSetter stops={stops} />
        </MapContainer>
      </div>

      {/* Station Drawer / Information Side Sheet */}
      {selectedStop && (
        <div className="absolute inset-x-0 bottom-0 z-20 md:relative md:inset-auto md:w-80 h-1/2 md:h-full bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col p-5 shadow-2xl transition-transform duration-300">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">{selectedStop.name}</h3>
              <p className="text-[10px] text-slate-400">Station Code: {selectedStop.id}</p>
            </div>
            <button
              onClick={() => setSelectedStop(null)}
              className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Upcoming departures list */}
          <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-accent" /> Upcoming Arrivals
            </h4>

            {loadingTimetable ? (
              <div className="text-center py-8 text-xs text-slate-500">Loading schedules...</div>
            ) : timetable.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No scheduled departures today.</div>
            ) : (
              <div className="space-y-2">
                {timetable.map((entry, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100/70 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-sm">{entry.departureTime || entry.arrivalTime}</span>
                      <span className="text-[9px] bg-blue-50 text-primary px-1.5 py-0.5 rounded font-semibold uppercase">
                        {entry.tripId}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Line: {entry.routeName}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
