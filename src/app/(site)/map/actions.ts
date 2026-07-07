'use server';

import { db } from '@/db';
import { stop, shapePoint, stopTime, route, trip } from '@/db/schema';
import { sql } from 'drizzle-orm';

export interface StationData {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface ShapeData {
  shapeId: string;
  points: { lat: number; lon: number }[];
}

export interface TimetableEntry {
  tripId: string;
  arrivalTime: string;
  departureTime: string;
  routeName: string;
}

export async function getMapData() {
  try {
    // 1. Fetch stops
    const stopsRes = await db.select().from(stop);
    const stops: StationData[] = stopsRes.map(s => ({
      id: s.stop_id,
      name: s.stop_name,
      lat: s.stop_lat,
      lon: s.stop_lon,
    }));

    // 2. Fetch shape points grouped by shapeId
    // To limit coordinates payload size, we fetch points in order of shape_id, shape_pt_sequence
    const shapesRes = await db.select().from(shapePoint).orderBy(shapePoint.shape_id, shapePoint.shape_pt_sequence);
    
    const shapesMap = new Map<string, { lat: number; lon: number }[]>();
    shapesRes.forEach(pt => {
      const existing = shapesMap.get(pt.shape_id) || [];
      existing.push({ lat: pt.shape_pt_lat, lon: pt.shape_pt_lon });
      shapesMap.set(pt.shape_id, existing);
    });

    const shapes: ShapeData[] = Array.from(shapesMap.entries()).map(([shapeId, points]) => ({
      shapeId,
      points,
    }));

    return { stops, shapes };
  } catch (err) {
    console.error('Error fetching map coordinates:', err);
    return { stops: [], shapes: [] };
  }
}

export async function getStationTimetable(stopId: string): Promise<TimetableEntry[]> {
  try {
    const timetableQuery = await db.execute(sql`
      SELECT 
        st.trip_id,
        st.arrival_time,
        st.departure_time,
        r.route_long_name
      FROM "StopTime" st
      JOIN "Trip" t ON st.trip_id = t.trip_id
      JOIN "Route" r ON t.route_id = r.route_id
      WHERE st.stop_id = ${stopId}
      ORDER BY st.departure_time ASC
      LIMIT 20
    `);

    return (timetableQuery as any[]).map(row => ({
      tripId: row.trip_id,
      arrivalTime: row.arrival_time,
      departureTime: row.departure_time,
      routeName: row.route_long_name,
    }));
  } catch (err) {
    console.error('Error fetching station timetable:', err);
    return [];
  }
}
