import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const backendUrl =
    process.env.API_BASE_URL ||
    'https://slr-transit-server-production.up.railway.app/api/v1';

  try {
    const res = await fetch(`${backendUrl}/realtime/vehicle-positions/list`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Upstream returned ${res.status}`);
    }

    const rawList = await res.json();

    const buses = (Array.isArray(rawList) ? rawList : []).map((b: any) => {
      // Parse route code from trip_id if route_id not clear (e.g. LMT_CM05_1_WP-NE-6488 -> CM05)
      let routeCode = b.route_id || '';
      if (!routeCode.startsWith('CM')) {
        const match = (b.trip_id || '').match(/CM0[1-8]/i);
        if (match) routeCode = match[0].toUpperCase();
      }

      const totalCap = b.capacity_total || 70;
      const currentCap = b.capacity_current ?? 0;
      const freeSeats =
        b.available_seats != null
          ? b.available_seats
          : Math.max(0, totalCap - currentCap);

      const occupancyPct =
        b.occupancy_percentage != null
          ? b.occupancy_percentage
          : Math.round((currentCap / totalCap) * 100);

      return {
        trip_id: b.trip_id,
        route_code: routeCode || 'CM01',
        direction_id: b.direction_id ?? 0,
        vehicle_id: b.vehicle_id || b.license_plate || 'BUS',
        license_plate: b.license_plate || b.vehicle_id || 'BUS',
        lat: b.latitude,
        lng: b.longitude,
        speed: Math.round((b.speed || 0) * 10) / 10,
        bearing: Math.round(b.bearing || 0),
        capacity_current: currentCap,
        capacity_total: totalCap,
        available_seats: freeSeats,
        occupancy_status: b.occupancy_status || (freeSeats > 25 ? 'MANY_SEATS_AVAILABLE' : freeSeats > 5 ? 'FEW_SEATS_AVAILABLE' : 'FULL'),
        occupancy_pct: occupancyPct,
        timestamp: b.timestamp || new Date().toISOString(),
        updated_at: b.updated_at || new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      count: buses.length,
      timestamp: new Date().toISOString(),
      buses,
    });
  } catch (error: any) {
    console.error('Error fetching live vehicles:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        count: 0,
        buses: [],
      },
      { status: 500 }
    );
  }
}
