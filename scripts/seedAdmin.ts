import { hash } from 'bcryptjs';

// usage: npm run seed:admin -- admin@fleet.com 'SomePassword123' +919876543210
const run = async () => {
  const [email, password, phone] = process.argv.slice(2);
  if (!email || !password || password.length < 8) {
    throw new Error('usage: npm run seed:admin -- <email> <password (min 8 chars)> [+phone]');
  }
  const { pool, closePool } = await import('../src/backend/db.js');
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, phone) VALUES ('Admin', $1, $2, 'admin', $3)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash, role = 'admin', phone = COALESCE(EXCLUDED.phone, users.phone)`,
    [email.toLowerCase(), await hash(password, 10), phone ?? null],
  );
  console.log(`admin ready: ${email.toLowerCase()}${phone ? ` (alerts go to ${phone})` : ' (no phone: will not receive alerts)'}`);
  await closePool();
};

run().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});