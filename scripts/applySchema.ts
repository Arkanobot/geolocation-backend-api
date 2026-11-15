import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// usage: npm run db:setup  |  npm run db:setup -- test
const run = async () => {
  if (process.argv[2] === 'test') process.env.NODE_ENV = 'test'; // must be set before config loads
  const { pool, closePool } = await import('../src/backend/db.js');
  await pool.query(readFileSync(join(__dirname, '../sql/schema.sql'), 'utf8'));
  console.log(`schema applied (${process.argv[2] === 'test' ? 'test' : 'main'} database)`);
  await closePool();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});