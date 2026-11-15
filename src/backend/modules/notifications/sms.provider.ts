import { config } from '../../config';

// an SMS provider is just a function: resolves when the SMS was accepted, throws when it failed.
export type SmsProvider = (to: string, message: string) => Promise<void>;

type StubOptions = {
  shouldFail?: () => boolean;
  log?: (line: string) => void;
};

// mock SMS service: "sends" by logging.
export const createStubSmsProvider =
  ({ shouldFail = () => config.smsForceFail, log = console.log }: StubOptions = {}): SmsProvider =>
  async (to, message) => {
    if (shouldFail()) throw new Error('SMS stub: forced failure');
    log(`[SMS stub] to=${to} message="${message}"`);
  };