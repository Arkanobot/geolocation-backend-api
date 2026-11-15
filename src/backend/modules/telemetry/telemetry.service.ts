import { notFoundError } from '../../../shared/helpers';
import type { Notifier } from '../notifications/notifications.service';
import { findVehicleById } from '../vehicles/vehicles.repository';
import { buildAlertMessage, detectCriticalEvents } from './telemetry.events';
import { insertTelemetry, listTelemetry } from './telemetry.repository';
import type {
  ListTelemetryFilter,
  RecordedTelemetryDto,
  TelemetryDto,
  TelemetryInput,
  TelemetryRow,
} from './telemetry.types';

export const toTelemetryDto = (row: TelemetryRow): TelemetryDto => ({
  id: row.id,
  vehicleId: row.vehicle_id,
  latitude: row.latitude,
  longitude: row.longitude,
  speed: row.speed,
  batteryLevel: row.battery_level,
  engineFault: row.engine_fault,
  emergencyStop: row.emergency_stop,
  createdAt: row.created_at,
});

export const recordTelemetry = async (input: TelemetryInput, notify: Notifier): Promise<RecordedTelemetryDto> => {
  const vehicle = await findVehicleById(input.vehicleId);
  if (!vehicle) throw notFoundError('Vehicle not found');

  const row = await insertTelemetry(input);

  const events = detectCriticalEvents(input);
  for (const event of events) {
    await notify({
      vehicleId: vehicle.id,
      type: event.type,
      message: buildAlertMessage(vehicle.registration_number, event, input),
    });
  }
  return { ...toTelemetryDto(row), alerts: events.map((e) => e.type) };
};

export const getTelemetry = async (filter: ListTelemetryFilter): Promise<TelemetryDto[]> =>
  (await listTelemetry(filter)).map(toTelemetryDto);