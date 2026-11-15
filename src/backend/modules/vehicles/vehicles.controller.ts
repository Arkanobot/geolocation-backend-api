import type { RequestHandler } from 'express';
import { parsePagination, parseUuid } from '../../../shared/helpers';
import {
  changeVehicleStatus,
  getVehicle,
  getVehicles,
  registerVehicle,
  removeVehicle,
} from './vehicles.service';
import { parseCreateVehicleInput, parseListStatusFilter, parseStatusInput } from './vehicles.validation';
import type { Notifier } from '../notifications/notifications.service';
import type { Geocoder } from '../maps/geocoder';

export const create =
  (geocoder: Geocoder): RequestHandler =>
  async (req, res) => {
    res.status(201).json(await registerVehicle(parseCreateVehicleInput(req.body), geocoder));
  };

export const list: RequestHandler = async (req, res) => {
  const { limit, offset } = parsePagination(req.query);
  const status = parseListStatusFilter(req.query.status);
  const data = await getVehicles({ limit, offset, ...(status ? { status } : {}) });
  res.json({ data, limit, offset });
};

export const getById: RequestHandler = async (req, res) => {
  res.json(await getVehicle(parseUuid(req.params.id)));
};

export const updateStatus =
  (notify: Notifier): RequestHandler =>
  async (req, res) => {
    const id = parseUuid(req.params.id);
    res.json(await changeVehicleStatus(id, parseStatusInput(req.body), notify));
  };

export const remove: RequestHandler = async (req, res) => {
  await removeVehicle(parseUuid(req.params.id));
  res.status(204).end();
};