import { assertValid, parseIntegerInRange, parseNumberInRange, parseUuid, requireFields } from '../../../shared/helpers';
import type { TelemetryInput } from './telemetry.types';

export const parseTelemetryInput = (body: unknown): TelemetryInput => {
  requireFields(body, ['vehicleId', 'latitude', 'longitude']);
  const { vehicleId, latitude, longitude, speed, batteryLevel, engineFault, emergencyStop } = body as Record<string, unknown>;

  assertValid(engineFault === undefined || typeof engineFault === 'boolean', 'engineFault must be a boolean');
  assertValid(emergencyStop === undefined || typeof emergencyStop === 'boolean', 'emergencyStop must be a boolean');

  return {
    vehicleId: parseUuid(vehicleId, 'vehicleId'),
    latitude: parseNumberInRange(latitude, 'latitude', -90, 90),
    longitude: parseNumberInRange(longitude, 'longitude', -180, 180),
    speed: speed === undefined ? null : parseNumberInRange(speed, 'speed', 0, 500),
    batteryLevel: batteryLevel === undefined ? null : parseIntegerInRange(batteryLevel, 'batteryLevel', 0, 100),
    engineFault: engineFault ?? false,
    emergencyStop: emergencyStop ?? false,
  };
};