import { ERROR_CODES } from '../../../shared/constants';
import { createHttpError, notFoundError } from '../../../shared/helpers';
import { toVehicleDto } from '../vehicles/vehicles.service';
import type { Geocoder, GeocodeResult } from './geocoder';
import { boundingBox, osmLink, roundTo } from './maps.geo';
import { findVehiclesWithinRadius } from './maps.repository';
import type { NearbyQuery } from './maps.types';

// address -> coordinates. 404 if the address doesn't exist, 502 if the geocoding service is down.
export const geocodeAddress = async (address: string, geocoder: Geocoder): Promise<GeocodeResult> => {
  let result: GeocodeResult | null;
  try {
    result = await geocoder(address);
  } catch (err) {
    console.error('Geocoder failed:', err instanceof Error ? err.message : err);
    throw createHttpError(502, ERROR_CODES.BAD_GATEWAY, 'Geocoding service is unavailable');
  }
  if (!result) throw notFoundError('No coordinates found for this address');
  return result;
};

export const findNearbyVehicles = async ({ center, radiusKm, status, limit }: NearbyQuery, geocoder: Geocoder) => {
  const point =
    center.kind === 'coordinates'
      ? { latitude: center.latitude, longitude: center.longitude }
      : await geocodeAddress(center.address, geocoder);

  const rows = await findVehiclesWithinRadius(point, radiusKm, boundingBox(point, radiusKm), status, limit);

  return {
    center: { latitude: point.latitude, longitude: point.longitude, ...(center.kind === 'address' ? { address: center.address } : {}) },
    radiusKm,
    count: rows.length,
    data: rows.map((row) => ({
      ...toVehicleDto(row),
      distanceKm: roundTo(row.distance_km, 2),
      mapUrl: osmLink({ latitude: row.latitude as number, longitude: row.longitude as number }),
    })),
  };
};