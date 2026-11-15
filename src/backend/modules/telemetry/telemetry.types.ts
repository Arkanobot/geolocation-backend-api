import type { NotificationType } from '../../../shared/constants';

export type TelemetryRow = {
  id: string;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  battery_level: number | null;
  engine_fault: boolean;
  emergency_stop: boolean;
  created_at: Date;
};

export type TelemetryDto = {
  id: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  batteryLevel: number | null;
  engineFault: boolean;
  emergencyStop: boolean;
  createdAt: Date;
};

// the POST response also says which alerts this reading raised
export type RecordedTelemetryDto = TelemetryDto & { alerts: NotificationType[] };

export type TelemetryInput = {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  batteryLevel: number | null;
  engineFault: boolean;
  emergencyStop: boolean;
};

export type ListTelemetryFilter = { vehicleId?: string; limit: number; offset: number };