'use server';

import { db } from '@/db';
import { stop, shapePoint, route, trip, stopTime } from '@/db/schema';
import { eq, asc, sql } from 'drizzle-orm';

export interface StationFixerData {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface RouteFixerData {
  id: string;
  shortName: string;
  longName: string;
}

export interface ShapeFixerData {
  shapeId: string;
  points: { lat: number; lon: number }[];
}

export async function getRouteFixerData() {
  try {
    const stopsRes = await db.select().from(stop).orderBy(stop.stop_name);
    const routesRes = await db.select().from(route).orderBy(route.route_long_name);
    const shapesRes = await db.select().from(shapePoint).orderBy(shapePoint.shape_id, shapePoint.shape_pt_sequence);

    const stops: StationFixerData[] = stopsRes.map(s => ({
      id: s.stop_id,
      name: s.stop_name,
      lat: s.stop_lat,
      lon: s.stop_lon,
    }));

    const routes: RouteFixerData[] = routesRes.map(r => ({
      id: r.route_id,
      shortName: r.route_short_name,
      longName: r.route_long_name,
    }));

    const shapesMap = new Map<string, { lat: number; lon: number }[]>();
    shapesRes.forEach(pt => {
      const existing = shapesMap.get(pt.shape_id) || [];
      existing.push({ lat: pt.shape_pt_lat, lon: pt.shape_pt_lon });
      shapesMap.set(pt.shape_id, existing);
    });

    const shapes: ShapeFixerData[] = Array.from(shapesMap.entries()).map(([shapeId, points]) => ({
      shapeId,
      points,
    }));

    return { success: true, stops, routes, shapes };
  } catch (err: any) {
    console.error('Error fetching route fixer data:', err);
    return { success: false, error: err.message, stops: [], routes: [], shapes: [] };
  }
}

export async function saveStopCoordinates(stopId: string, lat: number, lon: number) {
  try {
    await db.update(stop)
      .set({ stop_lat: lat, stop_lon: lon })
      .where(eq(stop.stop_id, stopId));

    console.log(`Updated stop ${stopId} to coordinates (${lat}, ${lon})`);
    return { success: true };
  } catch (err: any) {
    console.error(`Error saving stop ${stopId}:`, err);
    return { success: false, error: err.message };
  }
}

export async function saveRouteShapePoints(shapeId: string, points: { lat: number; lon: number }[]) {
  try {
    // Delete existing shape points
    await db.delete(shapePoint).where(eq(shapePoint.shape_id, shapeId));

    if (points.length > 0) {
      // Insert in chunks
      const shapePointsToInsert = points.map((p, idx) => ({
        shape_id: shapeId,
        shape_pt_sequence: idx + 1,
        shape_pt_lat: p.lat,
        shape_pt_lon: p.lon,
        shape_dist_traveled: idx * 2.5,
      }));

      // In drizzle, insert multiple rows
      await db.insert(shapePoint).values(shapePointsToInsert);
    }

    console.log(`Saved ${points.length} points for shape ${shapeId}`);
    return { success: true };
  } catch (err: any) {
    console.error(`Error saving shape points for ${shapeId}:`, err);
    return { success: false, error: err.message };
  }
}

export async function fetchOsmWayGeometry(osmId: string, type: 'way' | 'relation') {
  try {
    const overpassQuery = type === 'relation'
      ? `[out:json];relation(${osmId});out geom;`
      : `[out:json];way(${osmId});out geom;`;

    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch OSM geometry: ${res.statusText}`);
    }

    const data = await res.json();
    const elements = data.elements || [];
    const points: { lat: number; lon: number }[] = [];

    if (type === 'way') {
      const way = elements.find((el: any) => el.type === 'way');
      if (way && way.geometry) {
        way.geometry.forEach((g: any) => {
          points.push({ lat: g.lat, lon: g.lon });
        });
      }
    } else {
      // Relation: merge geometries from members in order
      const relation = elements.find((el: any) => el.type === 'relation');
      if (relation && relation.members) {
        relation.members.forEach((m: any) => {
          if (m.type === 'way' && m.geometry) {
            m.geometry.forEach((g: any) => {
              points.push({ lat: g.lat, lon: g.lon });
            });
          }
        });
      }
    }

    // Deduplicate consecutive points
    const deduped: { lat: number; lon: number }[] = [];
    points.forEach(p => {
      if (deduped.length === 0) {
        deduped.push(p);
      } else {
        const last = deduped[deduped.length - 1];
        const dist = Math.hypot(last.lat - p.lat, last.lon - p.lon);
        if (dist > 0.00001) {
          deduped.push(p);
        }
      }
    });

    return { success: true, points: deduped };
  } catch (err: any) {
    console.error(`Error fetching OSM geometry for ${type} ${osmId}:`, err);
    return { success: false, error: err.message, points: [] };
  }
}

export async function rebuildShapeFromStops(shapeId: string, routeId: string) {
  try {
    // 1. Fetch all trips for route
    const trips = await db.select().from(trip).where(eq(trip.route_id, routeId));
    if (trips.length === 0) {
      throw new Error(`No trips found for route ${routeId}`);
    }

    // 2. Query stop counts for each trip to find master
    const tripIds = trips.map(t => t.trip_id);
    const stopTimesRes = await db.select().from(stopTime).orderBy(stopTime.trip_id, stopTime.stop_sequence);

    // Group by trip
    const tripStopsMap = new Map<string, { lat: number; lon: number }[]>();
    
    // Fetch stops
    const stopsRes = await db.select().from(stop);
    const stopsMap = new Map<string, { lat: number; lon: number }>();
    stopsRes.forEach(s => stopsMap.set(s.stop_id, { lat: s.stop_lat, lon: s.stop_lon }));

    stopTimesRes.forEach(st => {
      if (!tripIds.includes(st.trip_id)) return;
      const coords = stopsMap.get(st.stop_id || '');
      if (coords) {
        const list = tripStopsMap.get(st.trip_id) || [];
        list.push(coords);
        tripStopsMap.set(st.trip_id, list);
      }
    });

    let masterTripId = '';
    let maxCount = 0;
    tripStopsMap.forEach((list, tid) => {
      if (list.length > maxCount) {
        maxCount = list.length;
        masterTripId = tid;
      }
    });

    const masterPoints = tripStopsMap.get(masterTripId) || [];
    if (masterPoints.length === 0) {
      throw new Error(`No stop coordinates found for master trip of route ${routeId}`);
    }

    // Save
    await saveRouteShapePoints(shapeId, masterPoints);

    return { success: true, points: masterPoints };
  } catch (err: any) {
    console.error('Error rebuilding shape from stops:', err);
    return { success: false, error: err.message, points: [] };
  }
}
