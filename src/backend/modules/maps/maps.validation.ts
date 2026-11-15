import { isVehicleStatus, VEHICLE_STATUS } from '../../../shared/constants';
import { assertValid, parseIntegerInRange, parseNumberInRange } from '../../../shared/helpers';
import type { NearbyQuery } from './maps.types';

export const parseGeocodeQuery = (q: Record<string, unknown>): string => {
  const { address } = q;
  assertValid(typeof address === 'string' && address.trim() !== '', 'address query parameter is required');
  return address.trim();
};

export const parseNearbyQuery = (q: Record<string, unknown>): NearbyQuery => {
  const { latitude, longitude, address, radiusKm, status, limit } = q;

  assertValid(radiusKm !== undefined, 'radiusKm is required');
  const hasCoordinates = latitude !== undefined || longitude !== undefined;
  assertValid(!(hasCoordinates && address !== undefined), 'Provide either address or latitude and longitude, not both');
  assertValid(
    hasCoordinates ? latitude !== undefined && longitude !== undefined : address !== undefined,
    'Provide an address, or both latitude and longitude',
  );
  assertValid(status === undefined || isVehicleStatus(status), `status must be one of: ${Object.values(VEHICLE_STATUS).join(', ')}`);

  let center: NearbyQuery['center'];
  if (hasCoordinates) {
    center = {
      kind: 'coordinates',
      latitude: parseNumberInRange(latitude, 'latitude', -90, 90),
      longitude: parseNumberInRange(longitude, 'longitude', -180, 180),
    };
  } else {
    assertValid(typeof address === 'string' && address.trim() !== '', 'address must be a non-empty string');
    center = { kind: 'address', address: address.trim() };
  }

  return {
    center,
    radiusKm: parseNumberInRange(radiusKm, 'radiusKm', 0.1, 1000),
    limit: limit === undefined ? 50 : parseIntegerInRange(limit, 'limit', 1, 100),
    ...(status !== undefined ? { status } : {}),
  };
};