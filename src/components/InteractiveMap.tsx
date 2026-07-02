'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { StationData, ShapeData } from '@/app/map/actions';

// Dynamically import map component with SSR disabled to prevent window is not defined crash
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
      <div className="text-center space-y-2">
        <MapPin className="h-8 w-8 text-primary animate-bounce mx-auto" />
        <p className="text-xs text-slate-500 font-semibold">Initializing Interactive Map Layer...</p>
      </div>
    </div>
  ),
});

interface InteractiveMapProps {
  stops: StationData[];
  shapes: ShapeData[];
}

export default function InteractiveMap({ stops, shapes }: InteractiveMapProps) {
  return <MapComponent stops={stops} shapes={shapes} />;
}
