import type { VehicleRow } from '../vehicles/vehicles.types';
import type { VehicleStatus } from '../../../shared/constants';

export type GeoPoint = { latitude: number; longitude: number };

export type BoundingBox = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number | null;
  maxLongitude: number | null;
};

export type NearbyCenter =
  | ({ kind: 'coordinates' } & GeoPoint)
  | { kind: 'address'; address: string };

export type NearbyQuery = {
  center: NearbyCenter;
  radiusKm: number;
  status?: VehicleStatus;
  limit: number;
};

export type NearbyVehicleRow = VehicleRow & { distance_km: number };