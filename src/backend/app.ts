import express, { type Express } from 'express';
import { notFound, errorHandler } from '../shared/middleware';
import { config } from './config';
import { createNominatimGeocoder, type Geocoder } from './modules/maps/geocoder';
import { createMapsRouter } from './modules/maps/maps.routes';
import { createNotificationRouter } from './modules/notifications/notifications.routes';
import { createNotifier } from './modules/notifications/notifications.service';
import { createStubSmsProvider, type SmsProvider } from './modules/notifications/sms.provider';
import { createTelemetryRouter } from './modules/telemetry/telemetry.routes';
import { createUserRouter } from './modules/users';
import { createVehicleRouter } from './modules/vehicles/vehicles.routes';

// things the app depends on.
export type AppDeps = { smsProvider?: SmsProvider; geocoder?: Geocoder };

export const createApp = (deps: AppDeps = {}): Express => {
  const notify = createNotifier(deps.smsProvider ?? createStubSmsProvider());
  const geocoder =
    deps.geocoder ??
    createNominatimGeocoder({ baseUrl: config.geocoderBaseUrl, userAgent: config.geocoderUserAgent });

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'backend' });
  });

  app.use('/api/users', createUserRouter());
  app.use('/api/vehicles', createVehicleRouter({ notify, geocoder }));
  app.use('/api/telemetry', createTelemetryRouter({ notify }));
  app.use('/api/maps', createMapsRouter({ geocoder }));
  app.use('/api/notifications', createNotificationRouter());

  app.use(notFound);
  app.use(errorHandler); // always last
  return app;
};