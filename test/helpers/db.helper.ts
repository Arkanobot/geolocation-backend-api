import { pool } from '../../src/backend/db';

// wipes all tables between tests. Do not allow to run unless it's clearly the test database.
export const resetDb = async () => {
  if (process.env.NODE_ENV !== 'test') throw new Error('resetDb only runs when NODE_ENV=test');
  if (process.env.DATABASE_URL && process.env.DATABASE_URL === process.env.TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL points at the main database, refusing to truncate');
  }
  await pool.query('TRUNCATE notifications, telemetry, vehicles, users CASCADE');
};