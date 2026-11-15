import { expect } from 'chai';
import { createNominatimGeocoder } from '../src/backend/modules/maps/geocoder';
import { boundingBox, haversineKm } from '../src/backend/modules/maps/maps.geo';

type FetchArgs = Parameters<typeof fetch>;

// fake fetch that records calls and answers with the given body
const fakeFetch = (body: unknown, status = 200) => {
  const calls: { url: URL; headers: Record<string, string> }[] = [];
  const fetchFn = (async (input: FetchArgs[0], init?: FetchArgs[1]) => {
    calls.push({ url: input as URL, headers: init?.headers as Record<string, string> });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { fetchFn, calls };
};

const make = (fetchFn: typeof fetch) =>
  createNominatimGeocoder({ baseUrl: 'https://nominatim.test', userAgent: 'tests/1.0 (me@example.com)', fetchFn, minIntervalMs: 0 });

describe('Nominatim geocoder', () => {
  it('asks Nominatim for one result, identifies itself, and parses the coordinates', async () => {
    const { fetchFn, calls } = fakeFetch([{ lat: '12.8698', lon: '74.8431', display_name: 'Hampankatta, Mangaluru' }]);
    const result = await make(fetchFn)('Hampankatta, Mangaluru');

    expect(result).to.deep.equal({ latitude: 12.8698, longitude: 74.8431, displayName: 'Hampankatta, Mangaluru' });
    expect(calls).to.have.length(1);
    expect(calls[0]!.url.pathname).to.equal('/search');
    expect(calls[0]!.url.searchParams.get('q')).to.equal('Hampankatta, Mangaluru');
    expect(calls[0]!.url.searchParams.get('limit')).to.equal('1');
    expect(calls[0]!.headers['User-Agent']).to.equal('tests/1.0 (me@example.com)');
  });

  it('returns null when the address is not found', async () => {
    const { fetchFn } = fakeFetch([]);
    expect(await make(fetchFn)('nowhere at all')).to.equal(null);
  });

  it('throws when Nominatim responds with an error status', async () => {
    const { fetchFn } = fakeFetch({}, 503);
    let error: unknown;
    await make(fetchFn)('anything').catch((e) => (error = e));
    expect(error).to.be.instanceOf(Error);
    expect((error as Error).message).to.include('503');
  });

  it('caches repeated lookups (one HTTP call for the same address)', async () => {
    const { fetchFn, calls } = fakeFetch([{ lat: '1', lon: '2', display_name: 'x' }]);
    const geocoder = make(fetchFn);
    await geocoder('Same Place');
    await geocoder('  same place ');
    expect(calls).to.have.length(1);
  });

  it('spaces requests at least minIntervalMs apart', async () => {
    const { fetchFn } = fakeFetch([{ lat: '1', lon: '2', display_name: 'x' }]);
    const sleeps: number[] = [];
    const geocoder = createNominatimGeocoder({
      baseUrl: 'https://nominatim.test',
      userAgent: 'tests',
      fetchFn,
      minIntervalMs: 1000,
      sleep: async (ms) => void sleeps.push(ms),
    });
    await geocoder('first');
    await geocoder('second');
    expect(sleeps).to.have.length(1); // the second call had to wait
    expect(sleeps[0]).to.be.within(1, 1000);
  });
});

describe('geo maths', () => {
  const mangaluru = { latitude: 12.8698, longitude: 74.8431 };

  it('haversineKm matches known distances', () => {
    expect(haversineKm(mangaluru, mangaluru)).to.equal(0);
    expect(haversineKm(mangaluru, { latitude: 13.3409, longitude: 74.7421 })).to.be.closeTo(53.5, 0.1); // Udupi
    expect(haversineKm(mangaluru, { latitude: 12.9716, longitude: 77.5946 })).to.be.closeTo(298.4, 0.2); // Bengaluru
  });

  it('boundingBox always contains the circle', () => {
    const box = boundingBox(mangaluru, 10);
    expect(box.minLatitude).to.be.lessThan(mangaluru.latitude);
    expect(box.maxLatitude).to.be.greaterThan(mangaluru.latitude);
    expect(box.minLongitude!).to.be.lessThan(mangaluru.longitude);
    expect(box.maxLongitude!).to.be.greaterThan(mangaluru.longitude);
    // a point exactly 10 km north must be inside the box
    const north = { latitude: mangaluru.latitude + 10 / 111.195, longitude: mangaluru.longitude };
    expect(north.latitude).to.be.at.most(box.maxLatitude + 1e-9);
  });

  it('boundingBox drops the longitude limits when it would cross the date line or a pole', () => {
    expect(boundingBox({ latitude: 0, longitude: 179.9 }, 50).minLongitude).to.equal(null);
    expect(boundingBox({ latitude: 89.9999, longitude: 10 }, 50).minLongitude).to.equal(null);
  });
});