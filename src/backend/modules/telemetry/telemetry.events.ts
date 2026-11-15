import { LOW_BATTERY_THRESHOLD, NOTIFICATION_TYPE, type NotificationType } from '../../../shared/constants';
import type { TelemetryInput } from './telemetry.types';

export type CriticalEvent = { type: NotificationType; description: string };

export const detectCriticalEvents = ({
  engineFault,
  emergencyStop,
  batteryLevel,
}: Pick<TelemetryInput, 'engineFault' | 'emergencyStop' | 'batteryLevel'>): CriticalEvent[] => {
  const events: CriticalEvent[] = [];
  if (engineFault) events.push({ type: NOTIFICATION_TYPE.ENGINE_FAULT, description: 'engine fault detected' });
  if (batteryLevel !== null && batteryLevel < LOW_BATTERY_THRESHOLD) {
    events.push({ type: NOTIFICATION_TYPE.LOW_BATTERY, description: `low battery (${batteryLevel}%)` });
  }
  if (emergencyStop) events.push({ type: NOTIFICATION_TYPE.EMERGENCY_STOP, description: 'emergency stop triggered' });
  return events;
};

export const buildAlertMessage = (
  registrationNumber: string,
  event: CriticalEvent,
  { latitude, longitude }: Pick<TelemetryInput, 'latitude' | 'longitude'>,
): string => `[Fleet Alert] Vehicle ${registrationNumber}: ${event.description} at ${latitude}, ${longitude}`;