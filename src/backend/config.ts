import 'dotenv/config';
import { requiredEnv } from '../shared/helpers';

const isTest = process.env.NODE_ENV === 'test';

export const config = {
  port: Number(process.env.BACKEND_PORT ?? 4000),
  // tests run against a separate database so TRUNCATE can never touch real data
  databaseUrl: requiredEnv(isTest ? 'TEST_DATABASE_URL' : 'DATABASE_URL'),
  dbSsl: process.env.DB_SSL !== 'false', // Supabase needs SSL; set DB_SSL=false for local Postgres
  jwtSecret: requiredEnv('JWT_SECRET'),
  jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 3600),
  // set SMS_FORCE_FAIL=true to make the SMS stub fail, so you can demo the `failed` status
  smsForceFail: process.env.SMS_FORCE_FAIL === 'true',
    // Nominatim (OpenStreetMap) geocoding. Its usage policy wants a User-Agent that identifies you: put your email in it.
  geocoderBaseUrl: process.env.GEOCODER_BASE_URL ?? 'https://nominatim.openstreetmap.org',
  geocoderUserAgent: process.env.GEOCODER_USER_AGENT ?? 'test_user_sga2',
} as const;