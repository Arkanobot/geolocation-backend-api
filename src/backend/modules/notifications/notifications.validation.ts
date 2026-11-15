import { isNotificationStatus, isNotificationType, NOTIFICATION_STATUS, NOTIFICATION_TYPE } from '../../../shared/constants';
import { assertValid, parseUuid } from '../../../shared/helpers';
import type { ListNotificationsFilter } from './notifications.types';

// builds only the filters that were actually provided
export const parseNotificationFilters = (q: Record<string, unknown>): Omit<ListNotificationsFilter, 'limit' | 'offset'> => {
  const { vehicleId, status, type } = q;
  assertValid(status === undefined || isNotificationStatus(status), `status must be one of: ${Object.values(NOTIFICATION_STATUS).join(', ')}`);
  assertValid(type === undefined || isNotificationType(type), `type must be one of: ${Object.values(NOTIFICATION_TYPE).join(', ')}`);
  return {
    ...(vehicleId !== undefined ? { vehicleId: parseUuid(vehicleId, 'vehicleId') } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(type !== undefined ? { type } : {}),
  };
};