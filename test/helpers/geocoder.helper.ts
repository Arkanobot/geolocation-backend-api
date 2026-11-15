import type { Geocoder } from '../../src/backend/modules/maps';

// fake geocoder backed by a lookup table: no network in tests. Unknown address -> null (not found).
export const createFakeGeocoder = (table: Record<string, { latitude: number; longitude: number }>) => {
  const calls: string[] = [];
  const geocoder: Geocoder = async (address) => {
    calls.push(address);
    const hit = table[address];
    return hit ? { ...hit, displayName: `${address} (fake)` } : null;
  };
  return { geocoder, calls };
};

export const failingGeocoder: Geocoder = async () => {
  throw new Error('geocoding service is down');
};