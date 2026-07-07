import React from 'react';
import { getRouteFixerData } from './actions';
import RouteFixerWrapper from '@/components/RouteFixerWrapper';

export const metadata = {
  title: 'Map Data Workbench | SLR Transit Admin',
  description: 'Interactive editor to geocode stations and correct track shape geometries.',
};

export default async function RouteFixerPage() {
  const data = await getRouteFixerData();

  if (!data.success) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/20 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <h1 className="text-xl font-bold text-red-500">Database Connection Failed</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Could not fetch transit metadata. Please check that DATABASE_URL is configured correctly.
          </p>
          <pre className="text-[10px] text-red-400/80 bg-black/40 p-3 rounded-lg overflow-x-auto text-left">
            {data.error}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <RouteFixerWrapper
      stops={data.stops}
      routes={data.routes}
      shapes={data.shapes}
    />
  );
}
