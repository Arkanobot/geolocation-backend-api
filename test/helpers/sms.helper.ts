import type { SmsProvider } from '../../src/backend/modules/notifications/sms.provider';

// fake SMS service that records what it was asked to send (or fails on demand)
export const createRecordingSmsProvider = ({ fail = false } = {}) => {
  const sent: { to: string; message: string }[] = [];
  const provider: SmsProvider = async (to, message) => {
    if (fail) throw new Error('SMS provider is down');
    sent.push({ to, message });
  };
  return { provider, sent };
};