'use server';

import { db } from '@/db';
import { stop, route, trip, stopTime } from '@/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';

export interface RouteOption {
  type: 'direct' | 'transfer';
  totalDurationMins: number;
  
  // Direct leg
  tripId1: string;
  routeName1: string;
  originName: string;
  originDepTime: string;
  destName: string;
  destArrTime: string;

  // Transfer leg (optional)
  transferStationName?: string;
  tripId2?: string;
  routeName2?: string;
  transferArrTime?: string;
  transferDepTime?: string;
  layoverMins?: string;
}

// Convert "HH:MM" or "HH:MM:SS" string to total minutes from midnight for easy math
function timeToMins(timeStr?: string | null): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

// Helper to format minutes back to HH:MM
function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export async function getStations() {
  try {
    const res = await db.select().from(stop).orderBy(stop.stop_name);
    return res.map(s => ({ id: s.stop_id, name: s.stop_name }));
  } catch (err) {
    console.error('Error fetching stations:', err);
    // Safe fallbacks for build or offline db
    return [
      { id: 'ST_FOT', name: 'Colombo Fort' },
      { id: 'ST_MAR', name: 'Maradana' },
      { id: 'ST_RAG', name: 'Ragama' },
      { id: 'ST_NEG', name: 'Negombo' },
      { id: 'ST_KAN', name: 'Kandy' },
      { id: 'ST_BAD', name: 'Badulla' },
    ];
  }
}

export async function findSchedules(
  originId: string,
  destinationId: string,
  timeStr: string,
  maxWaitTimeMins: number
): Promise<RouteOption[]> {
  if (!originId || !destinationId) return [];

  const depMinsLimit = timeToMins(timeStr);
  const results: RouteOption[] = [];

  try {
    // 1. FIND DIRECT ROUTES
    // Find all trips where StopTime matching originId exists with seq1, and StopTime matching destinationId exists with seq2, and seq1 < seq2
    const directQuery = await db.execute(sql`
      SELECT 
        ot.trip_id,
        r.route_long_name,
        o.stop_name as origin_name,
        ot.departure_time as origin_dep,
        d.stop_name as dest_name,
        dt.arrival_time as dest_arr
      FROM "StopTime" ot
      JOIN "StopTime" dt ON ot.trip_id = dt.trip_id
      JOIN "Trip" t ON ot.trip_id = t.trip_id
      JOIN "Route" r ON t.route_id = r.route_id
      JOIN "Stop" o ON ot.stop_id = o.stop_id
      JOIN "Stop" d ON dt.stop_id = d.stop_id
      WHERE ot.stop_id = ${originId}
        AND dt.stop_id = ${destinationId}
        AND ot.stop_sequence < dt.stop_sequence
      ORDER BY ot.departure_time ASC
      LIMIT 50
    `);

    const directRows = directQuery as any[];
    
    directRows.forEach(row => {
      const depMins = timeToMins(row.origin_dep);
      if (depMins < depMinsLimit) return; // Skip if before requested departure time

      const arrMins = timeToMins(row.dest_arr);
      // Handle overnight trips
      const duration = arrMins >= depMins ? (arrMins - depMins) : (1440 - depMins + arrMins);

      results.push({
        type: 'direct',
        totalDurationMins: duration,
        tripId1: row.trip_id,
        routeName1: row.route_long_name,
        originName: row.origin_name,
        originDepTime: row.origin_dep,
        destName: row.dest_name,
        destArrTime: row.dest_arr,
      });
    });

    // 2. FIND 1-STOP TRANSFER ROUTES
    // Find a trip T1 from origin -> J, and trip T2 from J -> dest
    // Where J is an intermediate transfer station, and T2 dep J > T1 arr J + 5m (layover buffer), and T2 dep J < T1 arr J + maxWaitTimeMins
    const transferQuery = await db.execute(sql`
      SELECT
        t1.trip_id as trip1,
        r1.route_long_name as route1,
        o.stop_name as origin_name,
        st1_o.departure_time as origin_dep,
        
        j.stop_name as junction_name,
        st1_j.arrival_time as t1_arr_j,
        st2_j.departure_time as t2_dep_j,
        
        t2.trip_id as trip2,
        r2.route_long_name as route2,
        d.stop_name as dest_name,
        st2_d.arrival_time as dest_arr
      FROM "StopTime" st1_o
      JOIN "StopTime" st1_j ON st1_o.trip_id = st1_j.trip_id
      JOIN "StopTime" st2_j ON st1_j.stop_id = st2_j.stop_id
      JOIN "StopTime" st2_d ON st2_j.trip_id = st2_d.trip_id
      
      JOIN "Trip" t1 ON st1_o.trip_id = t1.trip_id
      JOIN "Route" r1 ON t1.route_id = r1.route_id
      JOIN "Trip" t2 ON st2_j.trip_id = t2.trip_id
      JOIN "Route" r2 ON t2.route_id = r2.route_id
      
      JOIN "Stop" o ON st1_o.stop_id = o.stop_id
      JOIN "Stop" j ON st1_j.stop_id = j.stop_id
      JOIN "Stop" d ON st2_d.stop_id = d.stop_id
      
      WHERE st1_o.stop_id = ${originId}
        AND st2_d.stop_id = ${destinationId}
        AND st1_o.stop_sequence < st1_j.stop_sequence
        AND st2_j.stop_sequence < st2_d.stop_sequence
        AND t1.trip_id <> t2.trip_id
      LIMIT 100
    `);

    const transferRows = transferQuery as any[];
    
    transferRows.forEach(row => {
      const dep1Mins = timeToMins(row.origin_dep);
      if (dep1Mins < depMinsLimit) return; // Skip if before requested departure

      const arr1Mins = timeToMins(row.t1_arr_j);
      const dep2Mins = timeToMins(row.t2_dep_j);
      const arr2Mins = timeToMins(row.dest_arr);

      // Check layover window at Junction station
      const layover = dep2Mins >= arr1Mins ? (dep2Mins - arr1Mins) : (1440 - arr1Mins + dep2Mins);
      
      // Layover must be at least 5 minutes (time to change platforms)
      // And at most the user's customized wait limit (maxWaitTimeMins)
      if (layover < 5 || layover > maxWaitTimeMins) return;

      const totalDuration = dep2Mins >= dep1Mins 
        ? (arr2Mins >= dep2Mins ? (arr2Mins - dep1Mins) : (1440 - dep1Mins + arr2Mins))
        : (1440 - dep1Mins + arr2Mins); // Handles multi-day/overnight leg roll-overs

      results.push({
        type: 'transfer',
        totalDurationMins: totalDuration,
        tripId1: row.trip1,
        routeName1: row.route1,
        originName: row.origin_name,
        originDepTime: row.origin_dep,
        destName: row.dest_name,
        destArrTime: row.dest_arr,
        
        transferStationName: row.junction_name,
        tripId2: row.trip2,
        routeName2: row.route2,
        transferArrTime: row.t1_arr_j,
        transferDepTime: row.t2_dep_j,
        layoverMins: layover.toString(),
      });
    });

    // Sort by duration (fastest first)
    return results.sort((a, b) => a.totalDurationMins - b.totalDurationMins);
  } catch (err) {
    console.error('Error executing pathfinding routing query:', err);
    return [];
  }
}
