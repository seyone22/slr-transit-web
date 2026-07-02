import React from 'react';
import { getMapData } from './actions';
import InteractiveMap from '@/components/InteractiveMap';

export default async function MapPage() {
  const { stops, shapes } = await getMapData();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Interactive Network Map</h1>
        <p className="text-slate-500 text-sm">
          Click on station nodes to view upcoming arrivals and daily timetables. Double-click or scroll to zoom.
        </p>
      </div>

      <InteractiveMap stops={stops} shapes={shapes} />
    </div>
  );
}
