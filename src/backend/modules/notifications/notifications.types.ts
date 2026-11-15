import type { NotificationStatus, NotificationType } from '../../../shared/constants';

export type NotificationRow = {
  id: string;
  vehicle_id: string | null;
  recipient: string;
  type: NotificationType;
  message: string;
  status: NotificationStatus;
  created_at: Date;
};

export type NotificationDto = {
  id: string;
  vehicleId: string | null;
  recipient: string;
  type: NotificationType;
  message: string;
  status: NotificationStatus;
  createdAt: Date;
};

export type NewNotification = {
  vehicleId: string;
  recipient: string;
  type: NotificationType;
  message: string;
  status: NotificationStatus;
};

export type ListNotificationsFilter = {
  vehicleId?: string;
  status?: NotificationStatus;
  type?: NotificationType;
  limit: number;
  offset: number;
};