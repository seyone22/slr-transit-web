import React from 'react';
import { Database, Link2, FileSpreadsheet, Map } from 'lucide-react';

export default function DataAttributionPage() {
  const sources = [
    {
      title: 'Sri Lanka Railways Official PDF Schedules & Ticket Rates',
      description: 'Official passenger ticket prices are extracted from class-based fare schedules published on the official web domain of Sri Lanka Railways.',
      url: 'https://www.railway.gov.lk/',
      icon: FileSpreadsheet,
    },
    {
      title: 'LK Trains Database',
      description: 'Scheduled timetables, trains types (express, slow), and stops sequences are derived from community mappings of active locomotives.',
      url: 'https://lktrains.com/',
      icon: Database,
    },
    {
      title: 'TrainSchedule.lk',
      description: 'Reference stations timetables, routes mapping, and historical service calendars matched against public timetables.',
      url: 'https://trainschedule.lk/',
      icon: Link2,
    },
    {
      title: 'OpenStreetMap (OSM) Track Geometries',
      description: 'Physical railway tracks geometries, curves, and junctions coordinates between Colombo Fort and Badulla/Negombo are extracted from OpenStreetMap.',
      url: 'https://www.openstreetmap.org/',
      icon: Map,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">Data Attributions & Sourcing</h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          Open transit feeds rely on collaborative open-data sources. This page lists all data repositories, public schedules, and geocoding providers that have contributed to building the Sri Lanka Railways GTFS engine.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {sources.map((src, i) => {
          const Icon = src.icon;
          return (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start space-x-4">
              <div className="p-3 bg-blue-50 text-primary rounded-xl flex-none">
                <Icon className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-base">{src.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{src.description}</p>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-semibold text-accent hover:underline gap-1 pt-1"
                >
                  Visit Data Provider <Link2 className="h-3 w-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
