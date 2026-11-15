import type { GeoPoint } from './maps.types';

export type GeocodeResult = GeoPoint & { displayName: string };

export type Geocoder = (address: string) => Promise<GeocodeResult | null>;

type NominatimOptions = {
  baseUrl: string;
  userAgent: string;
  fetchFn?: typeof fetch;
  minIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

type NominatimHit = { lat: string; lon: string; display_name: string };

export const createNominatimGeocoder = ({
  baseUrl,
  userAgent,
  fetchFn = fetch,
  minIntervalMs = 1000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: NominatimOptions): Geocoder => {
  const cache = new Map<string, GeocodeResult | null>();
  let queue: Promise<unknown> = Promise.resolve();
  let lastRequestAt = 0;

  const lookup = async (address: string): Promise<GeocodeResult | null> => {
    const wait = lastRequestAt + minIntervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();

    const url = new URL('/search', baseUrl);
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');

    const res = await fetchFn(url, {
      headers: { 'User-Agent': userAgent, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Nominatim responded with ${res.status}`);

    const [hit] = (await res.json()) as NominatimHit[];
    if (!hit) return null;

    const latitude = Number(hit.lat);
    const longitude = Number(hit.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Nominatim returned invalid coordinates');
    return { latitude, longitude, displayName: hit.display_name };
  };

  return (address) => {
    const key = address.trim().toLowerCase();
    if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);

    const run = queue.then(() => lookup(address));
    queue = run.catch(() => undefined); // a failure must not block the queue
    return run.then((result) => {
      cache.set(key, result); // only successful lookups are cached
      return result;
    });
  };
};