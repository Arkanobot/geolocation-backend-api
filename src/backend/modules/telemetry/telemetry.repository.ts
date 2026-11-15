import { query, queryOne } from '../../db';
import type { ListTelemetryFilter, TelemetryInput, TelemetryRow } from './telemetry.types';

export const insertTelemetry = (t: TelemetryInput) =>
  queryOne<TelemetryRow>(
    `WITH reading AS (
       INSERT INTO telemetry (vehicle_id, latitude, longitude, speed, battery_level, engine_fault, emergency_stop)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *
     ),
     moved AS (
       UPDATE vehicles SET latitude = $2, longitude = $3, updated_at = now() WHERE id = $1
     )
     SELECT * FROM reading`,
    [t.vehicleId, t.latitude, t.longitude, t.speed, t.batteryLevel, t.engineFault, t.emergencyStop],
  ) as Promise<TelemetryRow>;

export const listTelemetry = ({ vehicleId, limit, offset }: ListTelemetryFilter) =>
  query<TelemetryRow>(
    `SELECT * FROM telemetry
     WHERE ($1::uuid IS NULL OR vehicle_id = $1)
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [vehicleId ?? null, limit, offset],
  );