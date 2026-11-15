import { NOTIFICATION_TYPE, type VehicleStatus } from '../../../shared/constants';
import type { Notifier } from '../notifications/notifications.service';
import { conflictError, notFoundError } from '../../../shared/helpers';
import { isUniqueViolation } from '../../db';
import {
  deleteVehicleById,
  findVehicleById,
  insertVehicle,
  listVehicles,
  updateVehicleStatus,
} from './vehicles.repository';
import type { CreateVehicleInput, ListVehiclesFilter, VehicleDto, VehicleRow } from './vehicles.types';
import type { Geocoder } from '../maps';


export const toVehicleDto = (row: VehicleRow): VehicleDto => ({
  id: row.id,
  registrationNumber: row.registration_number,
  model: row.model,
  status: row.status,
  address: row.address,
  latitude: row.latitude,
  longitude: row.longitude,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const vehicleNotFound = () => notFoundError('Vehicle not found');

const withCoordinates = async (input: CreateVehicleInput, geocoder: Geocoder): Promise<CreateVehicleInput> => {
  if (input.latitude !== null || !input.address) return input;
  try {
    const found = await geocoder(input.address);
    if (found) return { ...input, latitude: found.latitude, longitude: found.longitude };
  } catch (err) {
    console.error('Geocoding on registration failed:', err instanceof Error ? err.message : err);
  }
  return input;
};

export const registerVehicle = async (input: CreateVehicleInput, geocoder: Geocoder): Promise<VehicleDto> => {
  try {
    return toVehicleDto(await insertVehicle(await withCoordinates(input, geocoder)));
  } catch (err) {
    if (isUniqueViolation(err)) throw conflictError('A vehicle with this registration number already exists');
    throw err;
  }
};

export const getVehicle = async (id: string): Promise<VehicleDto> => {
  const row = await findVehicleById(id);
  if (!row) throw vehicleNotFound();
  return toVehicleDto(row);
};

export const getVehicles = async (filter: ListVehiclesFilter): Promise<VehicleDto[]> =>
  (await listVehicles(filter)).map(toVehicleDto);


export const removeVehicle = async (id: string): Promise<void> => {
  if (!(await deleteVehicleById(id))) throw vehicleNotFound();
};

export const changeVehicleStatus = async (id: string, status: VehicleStatus, notify: Notifier): Promise<VehicleDto> => {
  const existing = await findVehicleById(id);
  if (!existing) throw vehicleNotFound();
  if (existing.status === status) return toVehicleDto(existing); // nothing changed, nobody to notify

  const row = await updateVehicleStatus(id, status);
  if (!row) throw vehicleNotFound(); // deleted in between

  await notify({
    vehicleId: id,
    type: NOTIFICATION_TYPE.STATUS_CHANGE,
    message: `[Fleet Update] Vehicle ${row.registration_number} status changed from ${existing.status} to ${status}`,
  });
  return toVehicleDto(row);
};