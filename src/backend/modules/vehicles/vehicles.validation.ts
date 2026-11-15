import { VEHICLE_STATUS, isVehicleStatus, type VehicleStatus } from '../../../shared/constants';
import { assertValid, parseNumberInRange, requireFields } from '../../../shared/helpers';
import type { CreateVehicleInput } from './vehicles.types';

const STATUS_HINT = `status must be one of: ${Object.values(VEHICLE_STATUS).join(', ')}`;

export const parseCreateVehicleInput = (body: unknown): CreateVehicleInput => {
  requireFields(body, ['registrationNumber', 'model']);
  const { registrationNumber, model, status, address, latitude, longitude } = body as Record<string, unknown>;

  assertValid(typeof registrationNumber === 'string' && registrationNumber.trim() !== '', 'registrationNumber must be a non-empty string');
  assertValid(typeof model === 'string' && model.trim() !== '', 'model must be a non-empty string');
  assertValid(status === undefined || isVehicleStatus(status), STATUS_HINT);
  assertValid(address === undefined || typeof address === 'string', 'address must be a string');
  assertValid((latitude === undefined) === (longitude === undefined), 'latitude and longitude must be provided together');

  return {
    registrationNumber: registrationNumber.trim().toUpperCase(),
    model: model.trim(),
    status: status ?? VEHICLE_STATUS.ACTIVE,
    address: address?.trim() || null,
    latitude: latitude === undefined ? null : parseNumberInRange(latitude, 'latitude', -90, 90),
    longitude: longitude === undefined ? null : parseNumberInRange(longitude, 'longitude', -180, 180),
  };
};

export const parseStatusInput = (body: unknown): VehicleStatus => {
  requireFields(body, ['status']);
  const { status } = body as Record<string, unknown>;
  assertValid(isVehicleStatus(status), STATUS_HINT);
  return status;
};

export const parseListStatusFilter = (value: unknown): VehicleStatus | undefined => {
  if (value === undefined) return undefined;
  assertValid(isVehicleStatus(value), STATUS_HINT);
  return value;
};