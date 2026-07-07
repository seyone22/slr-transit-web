'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  StationFixerData,
  RouteFixerData,
  ShapeFixerData,
  saveStopCoordinates,
  saveRouteShapePoints,
  fetchOsmWayGeometry,
  rebuildShapeFromStops
} from '@/app/admin/routefixer/actions';
import {
  Search,
  MapPin,
  Save,
  Route,
  ArrowUpDown,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Undo2,
  Redo2,
  History,
  Target
} from 'lucide-react';

// Setup Leaflet marker icon asset fallbacks to prevent broken image links
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

// Inner helper component to handle map click events and viewport changes
function MapEvents({
  onMapClick,
  centerOn
}: {
  onMapClick?: (lat: number, lon: number) => void;
  centerOn?: [number, number] | null;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (centerOn) {
      map.setView(centerOn, 14, { animate: true });
    }
  }, [centerOn, map]);

  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });

  return null;
}

interface HistoryEntry {
  description: string;
  tab: 'stations' | 'shapes';
  selectedId: string;
  stationCoord?: { lat: number; lon: number };
  shapePoints?: { lat: number; lon: number }[];
}

interface RouteFixerComponentProps {
  initialStops: StationFixerData[];
  initialRoutes: RouteFixerData[];
  initialShapes: ShapeFixerData[];
}

export default function RouteFixerComponent({
  initialStops,
  initialRoutes,
  initialShapes
}: RouteFixerComponentProps) {
  // Tabs: 'stations' | 'shapes'
  const [activeTab, setActiveTab] = useState<'stations' | 'shapes'>('stations');

  // Core lists state
  const [stops, setStops] = useState<StationFixerData[]>(initialStops);
  const [routes] = useState<RouteFixerData[]>(initialRoutes);
  const [shapes, setShapes] = useState<ShapeFixerData[]>(initialShapes);

  // Selection states
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // Search/Filters
  const [stopFilter, setStopFilter] = useState('');
  const [shapeFilter, setShapeFilter] = useState('');

  // Coordinates edit state
  const [editLat, setEditLat] = useState<number>(0);
  const [editLon, setEditLon] = useState<number>(0);
  const [centerCoord, setCenterCoord] = useState<[number, number] | null>(null);

  // Nominatim OSM Search states
  const [osmSearchQuery, setOsmSearchQuery] = useState('');
  const [osmSearchResults, setOsmSearchResults] = useState<any[]>([]);
  const [searchingOsm, setSearchingOsm] = useState(false);

  // Shape edit states
  const [editShapePoints, setEditShapePoints] = useState<{ lat: number; lon: number }[]>([]);
  const [previewOsmPoints, setPreviewOsmPoints] = useState<{ lat: number; lon: number }[]>([]);
  const [osmImportId, setOsmImportId] = useState('');
  const [osmImportType, setOsmImportType] = useState<'way' | 'relation'>('way');

  // Highlight shape point index
  const [highlightedPointIndex, setHighlightedPointIndex] = useState<number | null>(null);

  // Undo/Redo History Stack
  const [historyStack, setHistoryStack] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Feedback notifications
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map reference
  const markerRef = useRef<L.Marker | null>(null);

  // Get active stop details
  const activeStop = useMemo(() => {
    return stops.find(s => s.id === selectedStopId) || null;
  }, [selectedStopId, stops]);

  // Get active shape details
  const activeShape = useMemo(() => {
    return shapes.find(s => s.shapeId === selectedShapeId) || null;
  }, [selectedShapeId, shapes]);

  // Helper to push states to Undo/Redo stack
  const pushToHistory = (description: string, data: any) => {
    const newStack = historyStack.slice(0, historyIndex + 1);
    const entry: HistoryEntry = {
      description,
      tab: activeTab,
      selectedId: activeTab === 'stations' ? selectedStopId || '' : selectedShapeId || '',
      stationCoord: activeTab === 'stations' ? { ...data } : undefined,
      shapePoints: activeTab === 'shapes' ? [...data] : undefined
    };
    const updated = [...newStack, entry];
    setHistoryStack(updated);
    setHistoryIndex(updated.length - 1);
  };

  // Set coordinates and reset history when a stop is selected
  useEffect(() => {
    if (activeStop) {
      setEditLat(activeStop.lat);
      setEditLon(activeStop.lon);
      setCenterCoord([activeStop.lat, activeStop.lon]);
      setOsmSearchQuery(`${activeStop.name} Railway Station, Sri Lanka`);
      setOsmSearchResults([]);
      setHighlightedPointIndex(null);

      // Initial history point
      const initial: HistoryEntry = {
        description: `Select ${activeStop.name}`,
        tab: 'stations',
        selectedId: activeStop.id,
        stationCoord: { lat: activeStop.lat, lon: activeStop.lon }
      };
      setHistoryStack([initial]);
      setHistoryIndex(0);
    }
  }, [selectedStopId]);

  // Load active shape points and reset history when a shape is selected
  useEffect(() => {
    if (activeShape) {
      setEditShapePoints([...activeShape.points]);
      setPreviewOsmPoints([]);
      setOsmImportId('');
      setHighlightedPointIndex(null);
      if (activeShape.points.length > 0) {
        setCenterCoord([activeShape.points[0].lat, activeShape.points[0].lon]);
      }

      // Initial history point
      const initial: HistoryEntry = {
        description: `Select ${activeShape.shapeId}`,
        tab: 'shapes',
        selectedId: activeShape.shapeId,
        shapePoints: [...activeShape.points]
      };
      setHistoryStack([initial]);
      setHistoryIndex(0);
    }
  }, [selectedShapeId]);

  // Trigger feedback banner
  const triggerStatus = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  // Undo Action
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const entry = historyStack[prevIndex];
      setHistoryIndex(prevIndex);
      
      if (entry.tab === 'stations') {
        setEditLat(entry.stationCoord!.lat);
        setEditLon(entry.stationCoord!.lon);
        setCenterCoord([entry.stationCoord!.lat, entry.stationCoord!.lon]);
      } else {
        setEditShapePoints([...entry.shapePoints!]);
      }
      triggerStatus(`Undone: ${historyStack[historyIndex].description}`, 'info');
    }
  };

  // Redo Action
  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const nextIndex = historyIndex + 1;
      const entry = historyStack[nextIndex];
      setHistoryIndex(nextIndex);
      
      if (entry.tab === 'stations') {
        setEditLat(entry.stationCoord!.lat);
        setEditLon(entry.stationCoord!.lon);
        setCenterCoord([entry.stationCoord!.lat, entry.stationCoord!.lon]);
      } else {
        setEditShapePoints([...entry.shapePoints!]);
      }
      triggerStatus(`Redone: ${entry.description}`, 'info');
    }
  };

  // Jump to specific state in history palette
  const handleJumpToHistory = (idx: number) => {
    const entry = historyStack[idx];
    setHistoryIndex(idx);
    if (entry.tab === 'stations') {
      setEditLat(entry.stationCoord!.lat);
      setEditLon(entry.stationCoord!.lon);
      setCenterCoord([entry.stationCoord!.lat, entry.stationCoord!.lon]);
    } else {
      setEditShapePoints([...entry.shapePoints!]);
    }
    triggerStatus(`Jumped to: ${entry.description}`, 'info');
  };

  // 1. Save Selected Station Coordinates
  const handleSaveStation = async () => {
    if (!selectedStopId) return;
    setIsSubmitting(true);
    const res = await saveStopCoordinates(selectedStopId, editLat, editLon);
    setIsSubmitting(false);

    if (res.success) {
      setStops(prev => prev.map(s => s.id === selectedStopId ? { ...s, lat: editLat, lon: editLon } : s));
      triggerStatus('Station coordinates successfully updated in database.', 'success');
    } else {
      triggerStatus(res.error || 'Failed to update coordinates.', 'error');
    }
  };

  // 2. Lookup station coordinates on Nominatim
  const handleLookupOsm = async (customQuery?: string) => {
    const query = customQuery || osmSearchQuery;
    if (!query) return;

    setSearchingOsm(true);
    setOsmSearchResults([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SLR-Transit-Workbench/1.0' }
      });
      if (res.ok) {
        const data = await res.json();
        setOsmSearchResults(data);
        if (data.length === 0) {
          triggerStatus('No locations found for this query on OpenStreetMap.', 'info');
        }
      } else {
        triggerStatus('Failed to query OSM Nominatim API.', 'error');
      }
    } catch (err: any) {
      triggerStatus(err.message || 'Geocoding request failed.', 'error');
    } finally {
      setSearchingOsm(false);
    }
  };

  // 3. Apply coordinates from OSM search result
  const applyOsmResult = (latStr: string, lonStr: string) => {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    setEditLat(lat);
    setEditLon(lon);
    setCenterCoord([lat, lon]);
    pushToHistory('OSM Geocoder Apply', { lat, lon });
    triggerStatus('Preview coordinates updated. Click Save to apply.', 'info');
  };

  // 4. Update coordinates from draggable marker
  const handleMarkerDragEnd = () => {
    const marker = markerRef.current;
    if (marker) {
      const latLng = marker.getLatLng();
      setEditLat(latLng.lat);
      setEditLon(latLng.lng);
      pushToHistory('Marker Drag', { lat: latLng.lat, lon: latLng.lng });
    }
  };

  // 5. Update coordinates by clicking on the map
  const handleMapClick = (lat: number, lon: number) => {
    if (activeTab === 'stations' && selectedStopId) {
      setEditLat(lat);
      setEditLon(lon);
      pushToHistory('Map Click coords', { lat, lon });
    } else if (activeTab === 'shapes' && selectedShapeId) {
      const newPoints = [...editShapePoints, { lat, lon }];
      setEditShapePoints(newPoints);
      pushToHistory('Add node from map', newPoints);
    }
  };

  // 6. Save Shape points
  const handleSaveShape = async () => {
    if (!selectedShapeId) return;
    setIsSubmitting(true);
    const res = await saveRouteShapePoints(selectedShapeId, editShapePoints);
    setIsSubmitting(false);

    if (res.success) {
      setShapes(prev => prev.map(s => s.shapeId === selectedShapeId ? { ...s, points: [...editShapePoints] } : s));
      triggerStatus('Route track shape points successfully saved.', 'success');
    } else {
      triggerStatus(res.error || 'Failed to save shape points.', 'error');
    }
  };

  // 7. Fetch track geometry from Overpass API
  const handleFetchOsmImport = async () => {
    if (!osmImportId) return;
    setIsSubmitting(true);
    const res = await fetchOsmWayGeometry(osmImportId, osmImportType);
    setIsSubmitting(false);

    if (res.success && res.points.length > 0) {
      setPreviewOsmPoints(res.points);
      const first = res.points[0];
      setCenterCoord([first.lat, first.lon]);
      triggerStatus(`Loaded ${res.points.length} coordinates from OSM. Click Apply to preview.`, 'success');
    } else {
      triggerStatus(res.error || 'Failed to load geometry from OSM.', 'error');
    }
  };

  // 8. Apply previewed Overpass API shape
  const applyImportedOsmPoints = () => {
    if (previewOsmPoints.length === 0) return;
    setEditShapePoints([...previewOsmPoints]);
    pushToHistory('Import OSM segment', previewOsmPoints);
    setPreviewOsmPoints([]);
    triggerStatus('OSM geometry applied. Remember to click Save shape to commit.', 'info');
  };

  // 9. Rebuild shape sequence from station stop order
  const handleRebuildFromStops = async () => {
    if (!selectedShapeId) return;
    
    const routeId = selectedShapeId.replace('SHAPE_', '');
    setIsSubmitting(true);
    const res = await rebuildShapeFromStops(selectedShapeId, routeId);
    setIsSubmitting(false);

    if (res.success && res.points.length > 0) {
      setEditShapePoints(res.points);
      pushToHistory('Stops reconstruction', res.points);
      triggerStatus('Shape reconstructed from stops. Click Save shape to commit.', 'success');
    } else {
      triggerStatus(res.error || 'Could not reconstruct shape from stops.', 'error');
    }
  };

  // Filtered lists
  const filteredStops = stops.filter(s =>
    s.name.toLowerCase().includes(stopFilter.toLowerCase()) ||
    s.id.toLowerCase().includes(stopFilter.toLowerCase())
  );

  const filteredShapes = shapes.filter(s =>
    s.shapeId.toLowerCase().includes(shapeFilter.toLowerCase())
  );

  return (
    <div className="h-screen w-screen bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden">
      
      {/* Light Mode Header */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-6 flex justify-between items-center shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
            <Sparkles className="h-5.5 w-5.5 text-blue-600" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base flex items-center gap-2">
              Sri Lanka Railways Transit Workbench
              <span className="text-[9px] bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold tracking-wide uppercase">
                Admin Mode
              </span>
            </h1>
            <p className="text-xs text-slate-500">Interactive platform mapping, coordinate overrides, and track geometry editor</p>
          </div>
        </div>

        {/* Action History Quick bar */}
        <div className="flex items-center gap-2 mr-4">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm cursor-pointer"
            title="Undo last action"
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= historyStack.length - 1}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm cursor-pointer"
            title="Redo action"
          >
            <Redo2 className="h-3.5 w-3.5" /> Redo
          </button>
        </div>

        {/* Tab switcher */}
        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1">
          <button
            onClick={() => {
              setActiveTab('stations');
              setCenterCoord(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'stations'
                ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" /> Station Coordinates
          </button>
          <button
            onClick={() => {
              setActiveTab('shapes');
              setCenterCoord(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'shapes'
                ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Route className="h-3.5 w-3.5" /> Track Geometries
          </button>
        </div>
      </header>

      {/* Main content body */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Feedback Alert Overlay */}
        {statusMsg && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className={`px-5 py-3 rounded-xl shadow-lg border flex items-center gap-3 text-xs font-semibold ${
              statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              statusMsg.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
              'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              {statusMsg.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              {statusMsg.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-600" />}
              <p>{statusMsg.text}</p>
            </div>
          </div>
        )}

        {/* LEFT COLUMN: Item Lists */}
        <aside className="w-[320px] bg-white border-r border-slate-200 flex flex-col h-full shrink-0 overflow-hidden">
          {activeTab === 'stations' ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/50">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search stations by name..."
                    value={stopFilter}
                    onChange={(e) => setStopFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>Listings</span>
                  <span>{filteredStops.length} stops</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {filteredStops.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStopId(s.id)}
                    className={`w-full text-left p-3.5 transition-all hover:bg-slate-50 flex items-start justify-between cursor-pointer ${
                      selectedStopId === s.id ? 'bg-blue-50/70 border-l-3 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex-1 pr-2">
                      <h4 className={`font-semibold text-xs transition-colors ${selectedStopId === s.id ? 'text-blue-900 font-bold' : 'text-slate-800'}`}>{s.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Code: {s.id}</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 font-mono space-y-0.5">
                      <div>Lat: {s.lat.toFixed(4)}</div>
                      <div>Lon: {s.lon.toFixed(4)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/50">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search track shape IDs..."
                    value={shapeFilter}
                    onChange={(e) => setShapeFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>Track Geometries</span>
                  <span>{filteredShapes.length} shapes</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {filteredShapes.map((s) => (
                  <button
                    key={s.shapeId}
                    onClick={() => setSelectedShapeId(s.shapeId)}
                    className={`w-full text-left p-3.5 transition-all hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                      selectedShapeId === s.shapeId ? 'bg-blue-50/70 border-l-3 border-blue-600' : ''
                    }`}
                  >
                    <div className="space-y-0.5">
                      <h4 className={`font-semibold text-xs transition-colors ${selectedShapeId === s.shapeId ? 'text-blue-900 font-bold' : 'text-slate-800'}`}>{s.shapeId}</h4>
                      <p className="text-[10px] text-slate-400">Linked to route segments</p>
                    </div>
                    <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-slate-600 font-bold">
                      {s.points.length} pts
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* MIDDLE COLUMN: Leaflet Map Container */}
        <main className="flex-1 h-full relative z-10 bg-slate-100">
          <MapContainer
            center={[6.93, 79.85]}
            zoom={9}
            style={{ height: '100%', width: '100%' }}
            className="z-10"
          >
            {/* CartoDB light Positron clean map tiles */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            {/* In STATIONS editor mode */}
            {activeTab === 'stations' && (
              <>
                {/* Draw all other stations as reference markers */}
                {stops.map(s => (
                  s.id !== selectedStopId && (
                    <CircleMarker
                      key={s.id}
                      center={[s.lat, s.lon]}
                      radius={4}
                      pathOptions={{
                        color: '#94a3b8',
                        fillColor: '#cbd5e1',
                        fillOpacity: 0.8,
                        weight: 1
                      }}
                    >
                      <Popup>
                        <div className="text-xs font-bold text-slate-800">{s.name} (Stop ID: {s.id})</div>
                      </Popup>
                    </CircleMarker>
                  )
                ))}

                {/* Draggable selected station marker */}
                {activeStop && (
                  <Marker
                    position={[editLat, editLon]}
                    draggable={true}
                    ref={markerRef}
                    eventHandlers={{
                      dragend: handleMarkerDragEnd
                    }}
                  >
                    <Popup>
                      <div className="text-center p-1 space-y-1">
                        <span className="text-xs font-extrabold text-blue-700 block">{activeStop.name}</span>
                        <span className="text-[9px] text-slate-500 block">Drag to adjust coordinates</span>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </>
            )}

            {/* In SHAPES editor mode */}
            {activeTab === 'shapes' && (
              <>
                {/* Draw stops as reference markers */}
                {stops.map(s => (
                  <CircleMarker
                    key={s.id}
                    center={[s.lat, s.lon]}
                    radius={3}
                    pathOptions={{
                      color: '#cbd5e1',
                      fillColor: '#f1f5f9',
                      fillOpacity: 1,
                      weight: 1.5
                    }}
                  />
                ))}

                {/* Render ALL other shapes as faint click-selectable lines */}
                {shapes.map((s) => (
                  s.shapeId !== selectedShapeId && (
                    <Polyline
                      key={s.shapeId}
                      positions={s.points.map(p => [p.lat, p.lon] as [number, number])}
                      eventHandlers={{
                        click: () => {
                          setSelectedShapeId(s.shapeId);
                          triggerStatus(`Selected shape: ${s.shapeId}`, 'info');
                        }
                      }}
                      pathOptions={{
                        color: '#94a3b8',
                        weight: 3,
                        opacity: 0.4
                      }}
                    />
                  )
                ))}

                {/* Draw currently selected editable shape line */}
                {selectedShapeId && editShapePoints.length > 0 && (
                  <>
                    <Polyline
                      positions={editShapePoints.map(p => [p.lat, p.lon] as [number, number])}
                      eventHandlers={{
                        click: () => {
                          triggerStatus(`Currently editing ${selectedShapeId}`, 'info');
                        }
                      }}
                      pathOptions={{
                        color: '#2563eb',
                        weight: 6,
                        opacity: 0.9
                      }}
                    />

                    {/* Plot interactive nodes for shape coordinates */}
                    {editShapePoints.map((p, idx) => {
                      const isHighlighted = highlightedPointIndex === idx;
                      return (
                        <CircleMarker
                          key={idx}
                          center={[p.lat, p.lon]}
                          radius={isHighlighted ? 8 : 4.5}
                          pathOptions={{
                            color: isHighlighted ? '#ffffff' : '#ffffff',
                            fillColor: isHighlighted ? '#ea580c' : '#2563eb',
                            fillOpacity: 1,
                            weight: 2
                          }}
                          eventHandlers={{
                            click: (e) => {
                              // Stop propagation to prevent map click event
                              L.DomEvent.stopPropagation(e);
                              setHighlightedPointIndex(idx);
                            }
                          }}
                        >
                          <Popup>
                            <div className="space-y-1.5 text-slate-800">
                              <p className="text-[9px] font-bold text-slate-400">INDEX: {idx + 1}</p>
                              <p className="text-xs font-bold font-mono">Lat: {p.lat.toFixed(5)}</p>
                              <p className="text-xs font-bold font-mono">Lon: {p.lon.toFixed(5)}</p>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => {
                                    const filtered = editShapePoints.filter((_, i) => i !== idx);
                                    setEditShapePoints(filtered);
                                    pushToHistory(`Delete node ${idx + 1}`, filtered);
                                    setHighlightedPointIndex(null);
                                  }}
                                  className="text-[9px] font-extrabold text-red-600 hover:underline cursor-pointer"
                                >
                                  Delete Node
                                </button>
                              </div>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })}
                  </>
                )}

                {/* Draw OSM imported preview line in green */}
                {previewOsmPoints.length > 0 && (
                  <Polyline
                    positions={previewOsmPoints.map(p => [p.lat, p.lon] as [number, number])}
                    pathOptions={{
                      color: '#10b981',
                      weight: 4,
                      opacity: 0.9,
                      dashArray: '5, 10'
                    }}
                  />
                )}
              </>
            )}

            <MapEvents onMapClick={handleMapClick} centerOn={centerCoord} />
          </MapContainer>
        </main>

        {/* RIGHT COLUMN: Inspector & Action Controls */}
        <aside className="w-[360px] bg-white border-l border-slate-200 flex flex-col p-5 overflow-y-auto h-full shrink-0 space-y-5">
          
          {/* STATIONS TAB INSPECTOR */}
          {activeTab === 'stations' ? (
            activeStop ? (
              <div className="space-y-5 flex-1 flex flex-col">
                <div className="space-y-1 shrink-0">
                  <h3 className="font-extrabold text-slate-900 text-sm">{activeStop.name}</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Stop ID: {activeStop.id}</p>
                </div>

                {/* Form fields */}
                <div className="space-y-3 shrink-0">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={editLat}
                        onChange={(e) => setEditLat(parseFloat(e.target.value) || 0)}
                        onBlur={() => pushToHistory('Manual Latitude Edit', { lat: editLat, lon: editLon })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={editLon}
                        onChange={(e) => setEditLon(parseFloat(e.target.value) || 0)}
                        onBlur={() => pushToHistory('Manual Longitude Edit', { lat: editLat, lon: editLon })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed italic">
                    ℹ️ You can adjust the coordinates by dragging the blue marker, or clicking anywhere directly on the map.
                  </p>

                  <button
                    onClick={handleSaveStation}
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer shrink-0"
                  >
                    <Save className="h-4 w-4" />
                    {isSubmitting ? 'Saving changes...' : 'Save Station Coordinates'}
                  </button>
                </div>

                <hr className="border-slate-100 shrink-0" />

                {/* Nominatim search */}
                <div className="space-y-3.5 shrink-0">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">OpenStreetMap Nominatim Lookup</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Search OSM to find exact matching coordinates for this station</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={osmSearchQuery}
                        onChange={(e) => setOsmSearchQuery(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleLookupOsm()}
                        disabled={searchingOsm}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer shrink-0"
                      >
                        {searchingOsm ? '...' : <Search className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    <button
                      onClick={() => handleLookupOsm(`${activeStop.name}, Sri Lanka`)}
                      className="text-[9px] text-slate-500 hover:text-slate-800 hover:underline flex items-center gap-1.5 cursor-pointer font-semibold"
                    >
                      <RotateCcw className="h-2.5 w-2.5" /> Retry with plain name fallback
                    </button>
                  </div>

                  {/* Search results list */}
                  {osmSearchResults.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden shadow-inner max-h-[160px] overflow-y-auto">
                      {osmSearchResults.map((r, idx) => (
                        <button
                          key={idx}
                          onClick={() => applyOsmResult(r.lat, r.lon)}
                          className="w-full text-left p-3 hover:bg-slate-100/60 transition-all flex items-start justify-between gap-3 text-[11px] cursor-pointer"
                        >
                          <div className="space-y-0.5 flex-1 pr-2">
                            <span className="font-semibold text-slate-700 block truncate leading-tight">{r.display_name}</span>
                            <span className="text-[9px] text-slate-400 block font-medium">Class: {r.class} ({r.type})</span>
                          </div>
                          <span className="text-[9px] text-blue-600 font-mono whitespace-nowrap bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded font-bold self-center">
                            Apply
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 space-y-3">
                <MapPin className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">Select a station from the list to start geocoding overrides.</p>
              </div>
            )
          ) : (
            // SHAPES TAB INSPECTOR
            activeShape ? (
              <div className="space-y-5 flex-1 flex flex-col">
                <div className="space-y-1 shrink-0">
                  <h3 className="font-extrabold text-slate-900 text-sm truncate">{activeShape.shapeId}</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Route shape geometry workbench</p>
                </div>

                {/* Operations */}
                <div className="grid grid-cols-2 gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const reversed = [...editShapePoints].reverse();
                      setEditShapePoints(reversed);
                      pushToHistory('Reverse track order', reversed);
                      triggerStatus('Shape coordinates reversed.', 'info');
                    }}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2 px-3 rounded-lg text-[10px] flex items-center justify-center gap-1.5 border border-slate-200 transition-all cursor-pointer"
                  >
                    <ArrowUpDown className="h-3 w-3" /> Reverse Order
                  </button>
                  <button
                    onClick={() => {
                      setEditShapePoints([]);
                      pushToHistory('Clear track shape', []);
                      triggerStatus('Shape points cleared.', 'info');
                    }}
                    className="bg-slate-50 hover:bg-red-50 text-red-600 hover:text-red-700 font-bold py-2 px-3 rounded-lg text-[10px] flex items-center justify-center gap-1.5 border border-slate-200 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" /> Clear Points
                  </button>
                </div>

                {/* Rebuild helper */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shrink-0">
                  <h4 className="text-xs font-bold text-slate-800">Reconstruct shape from Stop sequence</h4>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Build coordinates by connecting the stations in order of sequence for the longest trip of this route.
                  </p>
                  <button
                    onClick={handleRebuildFromStops}
                    disabled={isSubmitting}
                    className="w-full bg-blue-600/5 hover:bg-blue-600/10 text-blue-600 font-bold py-1.5 px-3 rounded-lg text-[10px] border border-blue-500/15 transition-all cursor-pointer"
                  >
                    Generate shape from stops
                  </button>
                </div>

                <hr className="border-slate-100 shrink-0" />

                {/* Import section */}
                <div className="space-y-3 shrink-0">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Import OSM geometry from Overpass API</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Lookup and import high-resolution curved track segments</p>
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={osmImportType}
                      onChange={(e: any) => setOsmImportType(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-xs text-slate-700 p-2 rounded-lg shrink-0"
                    >
                      <option value="way">Way ID</option>
                      <option value="relation">Relation ID</option>
                    </select>
                    <input
                      type="text"
                      placeholder="OSM ID (e.g. 6504048)"
                      value={osmImportId}
                      onChange={(e) => setOsmImportId(e.target.value)}
                      className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                    <button
                      onClick={handleFetchOsmImport}
                      disabled={isSubmitting}
                      className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      Fetch
                    </button>
                  </div>

                  {previewOsmPoints.length > 0 && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 shrink-0">
                      <p className="text-[10px] text-emerald-800 leading-tight">
                        Fetched {previewOsmPoints.length} coordinates. Highlighted in dotted green.
                      </p>
                      <button
                        onClick={applyImportedOsmPoints}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-[10px] transition-all cursor-pointer"
                      >
                        Apply OSM Geometry
                      </button>
                    </div>
                  )}
                </div>

                <hr className="border-slate-100 shrink-0" />

                {/* Save and coords inspector */}
                <div className="space-y-4 shrink-0">
                  <button
                    onClick={handleSaveShape}
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer shrink-0"
                  >
                    <Save className="h-4 w-4" />
                    {isSubmitting ? 'Saving shape...' : `Save Shape (${editShapePoints.length} points)`}
                  </button>

                  {/* Points list */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Shape point coordinates sequence</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200 max-h-[160px] overflow-y-auto shadow-inner">
                      {editShapePoints.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setHighlightedPointIndex(idx);
                            setCenterCoord([p.lat, p.lon]);
                          }}
                          className={`w-full p-2.5 flex items-center justify-between text-[10px] font-mono transition-all text-left cursor-pointer ${
                            highlightedPointIndex === idx ? 'bg-orange-50 text-orange-950 font-bold border-l-2 border-orange-500' : 'text-slate-600 hover:bg-slate-100/50'
                          }`}
                        >
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${highlightedPointIndex === idx ? 'bg-orange-200 text-orange-700' : 'bg-slate-200 text-slate-400'}`}>
                            {idx + 1}
                          </span>
                          <span>Lat: {p.lat.toFixed(5)}</span>
                          <span>Lon: {p.lon.toFixed(5)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const filtered = editShapePoints.filter((_, i) => i !== idx);
                              setEditShapePoints(filtered);
                              pushToHistory(`Delete node ${idx + 1}`, filtered);
                              setHighlightedPointIndex(null);
                            }}
                            className="text-red-600 hover:text-red-500 hover:underline text-[9px] font-bold"
                          >
                            Delete
                          </button>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 space-y-3">
                <Route className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">Select a shape from the list to edit its track coordinates.</p>
              </div>
            )
          )}

          {/* SHARED HISTORY PALETTE (Bottom pane of sidebar) */}
          {historyStack.length > 0 && (
            <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col shrink-0 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                <History className="h-3.5 w-3.5 text-slate-400" /> Actions Timeline
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[100px] overflow-y-auto text-[10px] shadow-inner">
                {historyStack.map((entry, idx) => {
                  const isActive = idx === historyIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleJumpToHistory(idx)}
                      className={`w-full text-left p-1.5 px-2.5 truncate font-medium transition-all cursor-pointer ${
                        isActive ? 'bg-blue-50 text-blue-700 font-bold border-l-2 border-blue-600' : 'text-slate-500 hover:bg-slate-100/50'
                      }`}
                    >
                      <span className="opacity-70 mr-1">{idx + 1}.</span> {entry.description}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </aside>

      </div>
    </div>
  );
}
