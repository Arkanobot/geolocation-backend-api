import 'dotenv/config';
import { requiredEnv } from '../shared/helpers';

export type ServiceName = 'users' | 'vehicles' | 'telemetry' | 'maps' | 'notifications';

export type GatewayConfig = {
  port: number;
  apiKeys: string[];
  rateLimit: { windowMs: number; max: number };
  services: Record<ServiceName, string>;
};

// gateway prefix -> logical service.
export const routes: { prefix: string; service: ServiceName }[] = [
  { prefix: '/api/users', service: 'users' },
  { prefix: '/api/vehicles', service: 'vehicles' },
  { prefix: '/api/telemetry', service: 'telemetry' },
  { prefix: '/api/maps', service: 'maps' },
  { prefix: '/api/notifications', service: 'notifications' },
];

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): GatewayConfig => {
  const backendUrl = env.BACKEND_URL ?? `http://localhost:${env.BACKEND_PORT ?? 4000}`;
  return {
    port: Number(env.PORT ?? env.GATEWAY_PORT ?? 3000),
    apiKeys: requiredEnv('API_KEYS', env).split(',').map((k) => k.trim()).filter(Boolean),
    rateLimit: {
      windowMs: Number(env.RATE_LIMIT_WINDOW_MS ?? 60_000),
      max: Number(env.RATE_LIMIT_MAX ?? 100),
    },
    services: {
      users: env.USER_SERVICE_URL ?? backendUrl,
      vehicles: env.VEHICLE_SERVICE_URL ?? backendUrl,
      telemetry: env.TELEMETRY_SERVICE_URL ?? backendUrl,
      maps: env.GEOLOCATION_SERVICE_URL ?? backendUrl,
      notifications: env.NOTIFICATION_SERVICE_URL ?? backendUrl,
    },
  };
};