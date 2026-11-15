import type { RequestHandler } from 'express';
import type { Geocoder } from './geocoder';
import { findNearbyVehicles, geocodeAddress } from './maps.service';
import { parseGeocodeQuery, parseNearbyQuery } from './maps.validation';

export const geocode =
  (geocoder: Geocoder): RequestHandler =>
  async (req, res) => {
    const address = parseGeocodeQuery(req.query);
    const { latitude, longitude, displayName } = await geocodeAddress(address, geocoder);
    res.json({ address, latitude, longitude, displayName });
  };

export const nearby =
  (geocoder: Geocoder): RequestHandler =>
  async (req, res) => {
    res.json(await findNearbyVehicles(parseNearbyQuery(req.query), geocoder));
  };