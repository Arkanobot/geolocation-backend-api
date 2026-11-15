import { query } from '../../db';
import type { VehicleStatus } from '../../../shared/constants';
import type { BoundingBox, GeoPoint, NearbyVehicleRow } from './maps.types';

export const findVehiclesWithinRadius = (
  center: GeoPoint,
  radiusKm: number,
  box: BoundingBox,
  status: VehicleStatus | undefined,
  limit: number,
) =>
  query<NearbyVehicleRow>(
    `SELECT * FROM (
       SELECT v.*,
              6371 * 2 * asin(least(1, sqrt(
                power(sin(radians(v.latitude - $1) / 2), 2) +
                cos(radians($1)) * cos(radians(v.latitude)) * power(sin(radians(v.longitude - $2) / 2), 2)
              ))) AS distance_km
       FROM vehicles v
       WHERE v.latitude IS NOT NULL
         AND v.longitude IS NOT NULL
         AND v.latitude BETWEEN $3 AND $4
         AND ($5::float8 IS NULL OR v.longitude BETWEEN $5 AND $6)
         AND ($7::text IS NULL OR v.status = $7)
     ) nearby
     WHERE distance_km <= $8
     ORDER BY distance_km ASC
     LIMIT $9`,
    [
      center.latitude,
      center.longitude,
      box.minLatitude,
      box.maxLatitude,
      box.minLongitude,
      box.maxLongitude,
      status ?? null,
      radiusKm,
      limit,
    ],
  );