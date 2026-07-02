import React from 'react';
import { getStations, findSchedules, RouteOption } from './actions';
import { Clock, Navigation, MapPin, ArrowRight, CornerDownRight, HelpCircle } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    time?: string;
    wait?: string;
  }>;
}

export default async function SchedulePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const stations = await getStations();

  const selectedFrom = params.from || '';
  const selectedTo = params.to || '';
  const selectedTime = params.time || '06:00';
  const selectedWait = params.wait ? Number(params.wait) : 60;

  let routes: RouteOption[] = [];
  let searched = false;

  if (selectedFrom && selectedTo) {
    searched = true;
    routes = await findSchedules(selectedFrom, selectedTo, selectedTime, selectedWait);
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Clock className="h-8 w-8 text-primary" />
          Schedule Finder
        </h1>
        <p className="text-slate-500 text-sm">
          Find direct train timetables or automatically calculate transfer routes.
        </p>
      </div>

      {/* Search form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <form method="GET" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 items-end">
          {/* Origin */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-accent" /> Origin Station
            </label>
            <select
              name="from"
              defaultValue={selectedFrom}
              required
              className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              <option value="">Select Origin...</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Navigation className="h-3.5 w-3.5 text-accent" /> Destination Station
            </label>
            <select
              name="to"
              defaultValue={selectedTo}
              required
              className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              <option value="">Select Destination...</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Departure After
            </label>
            <input
              type="time"
              name="time"
              defaultValue={selectedTime}
              className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Max Wait Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Max Layover Wait
            </label>
            <select
              name="wait"
              defaultValue={selectedWait.toString()}
              className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="60">1 Hour</option>
              <option value="120">2 Hours</option>
              <option value="180">3 Hours</option>
            </select>
          </div>

          {/* Submit */}
          <div>
            <button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors flex items-center justify-center text-sm shadow-md"
            >
              Search Schedules
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {searched && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Possible Connections</h2>
          {routes.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
              <HelpCircle className="h-10 w-10 text-slate-400 mx-auto" />
              <p className="font-semibold text-slate-700 text-sm">No connections found.</p>
              <p className="text-xs text-slate-500">
                Try expanding your Max Layover Wait time, or selecting a different departure time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {routes.map((routeOpt, i) => (
                <div
                  key={i}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all space-y-4"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      routeOpt.type === 'direct' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-primary border border-blue-200'
                    }`}>
                      {routeOpt.type === 'direct' ? 'Direct Connection' : '1-Stop Transfer'}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Duration: {Math.floor(routeOpt.totalDurationMins / 60)}h {routeOpt.totalDurationMins % 60}m
                    </span>
                  </div>

                  {/* Connection Timeline */}
                  <div className="space-y-4">
                    {/* Leg 1 */}
                    <div className="flex items-start gap-4">
                      <div className="flex-none p-1.5 bg-slate-50 text-slate-600 rounded-lg">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm">{routeOpt.originDepTime}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span className="font-semibold text-slate-800 text-sm">{routeOpt.type === 'direct' ? routeOpt.destArrTime : routeOpt.transferArrTime}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {routeOpt.originName} to {routeOpt.type === 'direct' ? routeOpt.destName : routeOpt.transferStationName}
                        </p>
                        <p className="text-[10px] bg-slate-100 inline-block px-1.5 py-0.5 rounded text-slate-500 font-semibold uppercase tracking-wider">
                          Line: {routeOpt.routeName1}
                        </p>
                      </div>
                    </div>

                    {/* Transfer Leg Details */}
                    {routeOpt.type === 'transfer' && (
                      <div className="pl-6 border-l-2 border-dashed border-slate-200 space-y-4 my-2">
                        {/* Transfer Node Warning */}
                        <div className="text-xs font-bold text-accent py-1 flex items-center gap-1">
                          <CornerDownRight className="h-4 w-4" /> Transfer layover at {routeOpt.transferStationName} for {routeOpt.layoverMins} mins
                        </div>

                        {/* Leg 2 */}
                        <div className="flex items-start gap-4">
                          <div className="flex-none p-1.5 bg-slate-50 text-slate-600 rounded-lg">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 text-sm">{routeOpt.transferDepTime}</span>
                              <ArrowRight className="h-3 w-3 text-slate-400" />
                              <span className="font-semibold text-slate-800 text-sm">{routeOpt.destArrTime}</span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {routeOpt.transferStationName} to {routeOpt.destName}
                            </p>
                            <p className="text-[10px] bg-slate-100 inline-block px-1.5 py-0.5 rounded text-slate-500 font-semibold uppercase tracking-wider">
                              Line: {routeOpt.routeName2}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
