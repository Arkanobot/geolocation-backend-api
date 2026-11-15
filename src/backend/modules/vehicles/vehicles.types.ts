import type { VehicleStatus } from '../../../shared/constants';

// shape of a row in the vehicles table
export type VehicleRow = {
  id: string;
  registration_number: string;
  model: string;
  status: VehicleStatus;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: Date;
  updated_at: Date;
};

// what the API returns
export type VehicleDto = {
  id: string;
  registrationNumber: string;
  model: string;
  status: VehicleStatus;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateVehicleInput = {
  registrationNumber: string;
  model: string;
  status: VehicleStatus;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type ListVehiclesFilter = { status?: VehicleStatus; limit: number; offset: number };