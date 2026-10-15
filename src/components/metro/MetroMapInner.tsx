'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

export interface LiveBus {
  trip_id: string;
  route_code: string;
  direction_id: number;
  vehicle_id: string;
  license_plate: string;
  lat: number;
  lng: number;
  speed: number;
  bearing: number;
  capacity_current: number;
  capacity_total: number;
  available_seats: number;
  occupancy_status: string;
  occupancy_pct: number;
  timestamp: string;
  updated_at: string;
}

export interface RouteCorridor {
  code: string;
  name: string;
  color: string;
  textColor: string;
  desc: string;
  points: [number, number][];
  points_return?: [number, number][];
}

export interface StopPoint {
  id: string;
  code: string;
  name: string;
  name_si?: string;
  lat: number;
  lng: number;
  is_station: boolean;
}

interface MetroMapInnerProps {
  routes: RouteCorridor[];
  stops: StopPoint[];
  buses: LiveBus[];
  selectedCorridor: string | null;
  selectedBus: LiveBus | null;
  onSelectBus: (bus: LiveBus | null) => void;
  onSelectCorridor: (code: string | null) => void;
  showStops: boolean;
  showBadges: boolean;
  mapTheme: 'dark' | 'light';
  recenterTrigger: number;
}

// Controller component to smoothly fly/pan
function MapController({
  selectedBus,
  selectedCorridor,
  routes,
  buses,
  recenterTrigger,
}: {
  selectedBus: LiveBus | null;
  selectedCorridor: string | null;
  routes: RouteCorridor[];
  buses: LiveBus[];
  recenterTrigger: number;
}) {
  const map = useMap();
  const initialFitDone = useRef(false);

  // Initial fit to active buses or Colombo Metropolitan area
  useEffect(() => {
    if (!initialFitDone.current && buses.length > 0) {
      const bounds = L.latLngBounds(buses.map((b) => [b.lat, b.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      initialFitDone.current = true;
    }
  }, [buses, map]);

  // Recenter trigger
  useEffect(() => {
    if (recenterTrigger > 0) {
      if (selectedCorridor) {
        const r = routes.find((rt) => rt.code === selectedCorridor);
        if (r && r.points.length > 0) {
          const bounds = L.latLngBounds(r.points);
          map.fitBounds(bounds, { padding: [60, 60] });
          return;
        }
      }
      if (buses.length > 0) {
        const bounds = L.latLngBounds(buses.map((b) => [b.lat, b.lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      } else {
        map.setView([6.9271, 79.8612], 12);
      }
    }
  }, [recenterTrigger, map, selectedCorridor, routes, buses]);

  // Pan to selected bus
  useEffect(() => {
    if (selectedBus) {
      map.flyTo([selectedBus.lat, selectedBus.lng], Math.max(map.getZoom(), 14), {
        duration: 1.2,
      });
    }
  }, [selectedBus, map]);

  // Fit bounds when corridor selection changes
  useEffect(() => {
    if (selectedCorridor) {
      const r = routes.find((rt) => rt.code === selectedCorridor);
      if (r && r.points.length > 0) {
        const bounds = L.latLngBounds(r.points);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      }
    }
  }, [selectedCorridor, routes, map]);

  return null;
}

export default function MetroMapInner({
  routes,
  stops,
  buses,
  selectedCorridor,
  selectedBus,
  onSelectBus,
  onSelectCorridor,
  showStops,
  showBadges,
  mapTheme,
  recenterTrigger,
}: MetroMapInnerProps) {
  // Filter buses by selected corridor
  const visibleBuses = useMemo(() => {
    if (!selectedCorridor) return buses;
    return buses.filter((b) => b.route_code === selectedCorridor);
  }, [buses, selectedCorridor]);

  // Route color lookup map
  const routeColorMap = useMemo(() => {
    const map = new Map<string, string>();
    routes.forEach((r) => map.set(r.code, r.color));
    return map;
  }, [routes]);

  // Create custom DivIcon for a live bus
  const createBusIcon = (bus: LiveBus) => {
    const color = routeColorMap.get(bus.route_code) || '#10b981';
    const isMoving = bus.speed > 3;
    const isSelected = selectedBus?.trip_id === bus.trip_id;

    const freeSeats = bus.available_seats;
    const totalCap = bus.capacity_total || 70;
    const badgeClass =
      freeSeats > 20
        ? 'badge-green'
        : freeSeats > 5
        ? 'badge-amber'
        : 'badge-red';

    const badgeLabel =
      freeSeats > 0 ? `${freeSeats}/${totalCap} free` : 'FULL (0 free)';

    const html = `
      <div class="metro-bus-marker-wrapper ${isSelected ? 'selected' : ''}">
        ${
          showBadges
            ? `
          <div class="metro-seat-badge ${badgeClass}">
            <span class="metro-seat-dot"></span>
            <span>${badgeLabel}</span>
          </div>
        `
            : ''
        }
        <div class="metro-bus-pin ${isMoving ? 'is-moving' : ''}" style="background-color: ${color}; --pin-color: ${color}; transform: rotate(${bus.bearing}deg);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 19 21 12 17 5 21 12 2" fill="white" />
          </svg>
        </div>
        <div class="metro-bus-plate" style="border-color: ${color};">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${color}; margin-right:3px;"></span>
          ${bus.license_plate}
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'metro-bus-icon',
      html,
      iconSize: [80, 70],
      iconAnchor: [40, 35],
    });
  };

  // Station stop icon
  const stationIcon = useMemo(() => {
    return L.divIcon({
      className: 'metro-station-icon',
      html: '<div class="metro-station-dot"></div>',
      iconSize: [8, 8],
      iconAnchor: [4, 4],
    });
  }, []);

  const tileBaseUrl =
    mapTheme === 'dark'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

  const tileRefUrl =
    mapTheme === 'dark'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';

  return (
    <div className="metro-map-container">
      <MapContainer
        center={[6.9271, 79.8612]} // Central Colombo
        zoom={12}
        className="w-full h-full"
        zoomControl={false}
      >
        {/* Clean ESRI Basemap (Zero watermark, No API key required) */}
        <TileLayer
          key={`base-${mapTheme}`}
          url={tileBaseUrl}
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin | LMT Fleet Telemetry'
          maxZoom={16}
        />
        <TileLayer
          key={`ref-${mapTheme}`}
          url={tileRefUrl}
          opacity={0.85}
          maxZoom={16}
        />

        {/* 7 Colour-Coded CM Corridors */}
        {routes.map((route) => {
          const isSelected = selectedCorridor === route.code;
          const isDimmed = selectedCorridor && !isSelected;

          const glowWeight = isSelected ? 10 : 7;
          const innerWeight = isSelected ? 5 : 3.5;
          const glowOpacity = isDimmed ? 0.08 : isSelected ? 0.45 : 0.22;
          const innerOpacity = isDimmed ? 0.25 : isSelected ? 1.0 : 0.85;

          return (
            <React.Fragment key={route.code}>
              {/* Forward Direction Polyline */}
              {route.points.length > 0 && (
                <>
                  {/* Outer Ambient Glow Line */}
                  <Polyline
                    positions={route.points}
                    pathOptions={{
                      color: route.color,
                      weight: glowWeight,
                      opacity: glowOpacity,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                  {/* Sharp Core Polyline */}
                  <Polyline
                    positions={route.points}
                    pathOptions={{
                      color: route.color,
                      weight: innerWeight,
                      opacity: innerOpacity,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                    eventHandlers={{
                      click: () => onSelectCorridor(route.code),
                    }}
                  >
                    <Tooltip sticky>
                      <div className="font-sans text-xs font-bold text-slate-900 py-0.5">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                          style={{ backgroundColor: route.color }}
                        ></span>
                        {route.code}: {route.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        {route.desc}
                      </div>
                    </Tooltip>
                  </Polyline>
                </>
              )}

              {/* Return Direction Polyline (if distinct) */}
              {route.points_return && route.points_return.length > 0 && (
                <Polyline
                  positions={route.points_return}
                  pathOptions={{
                    color: route.color,
                    weight: isSelected ? 4 : 2.5,
                    opacity: isDimmed ? 0.2 : isSelected ? 0.9 : 0.6,
                    dashArray: '6, 8',
                    lineCap: 'round',
                  }}
                  eventHandlers={{
                    click: () => onSelectCorridor(route.code),
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* 220 Station Stops Layer */}
        {showStops &&
          stops.map((stop) => (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lng]}
              icon={stationIcon}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                <div className="text-xs font-semibold text-slate-900">
                  {stop.name}
                </div>
                {stop.name_si && (
                  <div className="text-[11px] text-slate-600 font-medium font-sans">
                    {stop.name_si}
                  </div>
                )}
                <div className="text-[9px] text-slate-400 uppercase font-mono mt-0.5">
                  Stop #{stop.id} • {stop.code || 'LMT Platform'}
                </div>
              </Tooltip>
            </Marker>
          ))}

        {/* Live Moving Buses */}
        {visibleBuses.map((bus) => (
          <Marker
            key={bus.trip_id}
            position={[bus.lat, bus.lng]}
            icon={createBusIcon(bus)}
            eventHandlers={{
              click: () => onSelectBus(bus),
            }}
          />
        ))}

        <MapController
          selectedBus={selectedBus}
          selectedCorridor={selectedCorridor}
          routes={routes}
          buses={visibleBuses}
          recenterTrigger={recenterTrigger}
        />
      </MapContainer>
    </div>
  );
}
