export const VEHICLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MAINTENANCE: 'maintenance',
} as const;

export type VehicleStatus = (typeof VEHICLE_STATUS)[keyof typeof VEHICLE_STATUS];

export const isVehicleStatus = (value: unknown): value is VehicleStatus =>
  Object.values(VEHICLE_STATUS).includes(value as VehicleStatus);

export const NOTIFICATION_TYPE = {
  ENGINE_FAULT: 'ENGINE_FAULT',
  LOW_BATTERY: 'LOW_BATTERY',
  EMERGENCY_STOP: 'EMERGENCY_STOP',
  STATUS_CHANGE: 'STATUS_CHANGE',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const isNotificationType = (value: unknown): value is NotificationType =>
  Object.values(NOTIFICATION_TYPE).includes(value as NotificationType);

export const NOTIFICATION_STATUS = {
  SENT: 'sent',
  FAILED: 'failed',
} as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];

export const isNotificationStatus = (value: unknown): value is NotificationStatus =>
  Object.values(NOTIFICATION_STATUS).includes(value as NotificationStatus);