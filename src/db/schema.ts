import { pgTable, text, doublePrecision, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core';

export const stop = pgTable('Stop', {
  stop_id: text('stop_id').primaryKey(),
  stop_name: text('stop_name').notNull(),
  stop_lat: doublePrecision('stop_lat').notNull(),
  stop_lon: doublePrecision('stop_lon').notNull(),
  zone_id: text('zone_id'),
});

export const route = pgTable('Route', {
  route_id: text('route_id').primaryKey(),
  agency_id: text('agency_id').notNull(),
  route_short_name: text('route_short_name').notNull(),
  route_long_name: text('route_long_name').notNull(),
  route_desc: text('route_desc'),
  route_type: integer('route_type').notNull(),
  route_color: text('route_color'),
  route_text_color: text('route_text_color'),
});

export const trip = pgTable('Trip', {
  trip_id: text('trip_id').primaryKey(),
  route_id: text('route_id').notNull(),
  service_id: text('service_id').notNull(),
  trip_headsign: text('trip_headsign'),
  trip_short_name: text('trip_short_name'),
  direction_id: integer('direction_id'),
  block_id: text('block_id'),
  shape_id: text('shape_id'),
});

export const stopTime = pgTable('StopTime', {
  trip_id: text('trip_id').notNull(),
  arrival_time: text('arrival_time'),
  departure_time: text('departure_time'),
  stop_id: text('stop_id'),
  stop_sequence: integer('stop_sequence').notNull(),
  pickup_type: integer('pickup_type'),
  drop_off_type: integer('drop_off_type'),
  shape_dist_traveled: doublePrecision('shape_dist_traveled'),
}, (table) => [
  primaryKey({ columns: [table.trip_id, table.stop_sequence] })
]);

export const shapePoint = pgTable('ShapePoint', {
  shape_id: text('shape_id').notNull(),
  shape_pt_sequence: integer('shape_pt_sequence').notNull(),
  shape_pt_lat: doublePrecision('shape_pt_lat').notNull(),
  shape_pt_lon: doublePrecision('shape_pt_lon').notNull(),
  shape_dist_traveled: doublePrecision('shape_dist_traveled'),
}, (table) => [
  primaryKey({ columns: [table.shape_id, table.shape_pt_sequence] })
]);

export const realtimeTripUpdate = pgTable('RealtimeTripUpdate', {
  trip_id: text('trip_id').primaryKey(),
  delay: integer('delay').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const realtimeAlert = pgTable('RealtimeAlert', {
  id: text('id').primaryKey(),
  header_text: text('header_text').notNull(),
  description: text('description').notNull(),
  cause: text('cause'),
  effect: text('effect'),
  active_start: timestamp('active_start'),
  active_end: timestamp('active_end'),
});
