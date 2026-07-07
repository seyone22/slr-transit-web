'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Shield } from 'lucide-react';
import { StationFixerData, RouteFixerData, ShapeFixerData } from '@/app/admin/routefixer/actions';

const RouteFixerComponent = dynamic(() => import('@/components/RouteFixerComponent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center space-y-3">
        <Shield className="h-10 w-10 text-blue-500 animate-pulse mx-auto" />
        <p className="text-sm text-slate-400 font-semibold">Initializing Route Fixer Workbench...</p>
      </div>
    </div>
  ),
});

interface RouteFixerWrapperProps {
  stops: StationFixerData[];
  routes: RouteFixerData[];
  shapes: ShapeFixerData[];
}

export default function RouteFixerWrapper({ stops, routes, shapes }: RouteFixerWrapperProps) {
  return <RouteFixerComponent initialStops={stops} initialRoutes={routes} initialShapes={shapes} />;
}
