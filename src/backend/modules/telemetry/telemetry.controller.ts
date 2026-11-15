import type { RequestHandler } from 'express';
import { parsePagination, parseUuid } from '../../../shared/helpers';
import type { Notifier } from '../notifications/notifications.service';
import { getTelemetry, recordTelemetry } from './telemetry.service';
import { parseTelemetryInput } from './telemetry.validation';

export const submit =
  (notify: Notifier): RequestHandler =>
  async (req, res) => {
    res.status(201).json(await recordTelemetry(parseTelemetryInput(req.body), notify));
  };

export const list: RequestHandler = async (req, res) => {
  const { limit, offset } = parsePagination(req.query);
  const vehicleId = req.query.vehicleId === undefined ? undefined : parseUuid(req.query.vehicleId, 'vehicleId');
  const data = await getTelemetry({ limit, offset, ...(vehicleId ? { vehicleId } : {}) });
  res.json({ data, limit, offset });
};