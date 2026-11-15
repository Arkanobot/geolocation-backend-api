import { query, queryOne } from '../../db';
import type { VehicleStatus } from '../../../shared/constants';
import type { CreateVehicleInput, ListVehiclesFilter, VehicleRow } from './vehicles.types';

export const insertVehicle = (v: CreateVehicleInput) =>
  queryOne<VehicleRow>(
    `INSERT INTO vehicles (registration_number, model, status, address, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [v.registrationNumber, v.model, v.status, v.address, v.latitude, v.longitude],
  ) as Promise<VehicleRow>;

export const findVehicleById = (id: string) =>
  queryOne<VehicleRow>('SELECT * FROM vehicles WHERE id = $1', [id]);

export const listVehicles = ({ status, limit, offset }: ListVehiclesFilter) =>
  query<VehicleRow>(
    `SELECT * FROM vehicles
     WHERE ($1::text IS NULL OR status = $1)
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [status ?? null, limit, offset],
  );

export const updateVehicleStatus = (id: string, status: VehicleStatus) =>
  queryOne<VehicleRow>(
    'UPDATE vehicles SET status = $2, updated_at = now() WHERE id = $1 RETURNING *',
    [id, status],
  );

// true if a row was deleted
export const deleteVehicleById = async (id: string): Promise<boolean> =>
  (await query('DELETE FROM vehicles WHERE id = $1 RETURNING id', [id])).length > 0;