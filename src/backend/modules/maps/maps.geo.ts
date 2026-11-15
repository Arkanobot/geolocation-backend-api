import type { BoundingBox, GeoPoint } from './maps.types';

const EARTH_RADIUS_KM = 6371;
const KM_PER_DEGREE_LATITUDE = 111.195;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const haversineKm = (a: GeoPoint, b: GeoPoint): number => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(x)));
};

export const boundingBox = ({ latitude, longitude }: GeoPoint, radiusKm: number): BoundingBox => {
  const latDelta = radiusKm / KM_PER_DEGREE_LATITUDE;
  const minLatitude = Math.max(-90, latitude - latDelta);
  const maxLatitude = Math.min(90, latitude + latDelta);

  const cosLat = Math.cos(toRadians(latitude));
  const lngDelta = cosLat < 1e-6 ? 360 : radiusKm / (KM_PER_DEGREE_LATITUDE * cosLat);
  const minLongitude = longitude - lngDelta;
  const maxLongitude = longitude + lngDelta;
  const wrapsAround = minLongitude < -180 || maxLongitude > 180;

  return {
    minLatitude,
    maxLatitude,
    minLongitude: wrapsAround ? null : minLongitude,
    maxLongitude: wrapsAround ? null : maxLongitude,
  };
};

export const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

// plain link that opens a point on OpenStreetMap (a "map view" without any frontend)
export const osmLink = ({ latitude, longitude }: GeoPoint): string =>
  `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`;