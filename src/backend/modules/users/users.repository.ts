import { query, queryOne } from '../../db';
import { ROLES, type Role } from '../../../shared/constants';
import type { UserRow } from './users.types';

export const findUserByEmail = (email: string) =>
  queryOne<UserRow>('SELECT * FROM users WHERE email = $1', [email]);

export const findUserById = (id: string) =>
  queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id]);

export const insertUser = (u: {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  phone?: string | null;
}) =>
  queryOne<UserRow>(
    `INSERT INTO users (name, email, password_hash, role, phone)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [u.name, u.email, u.passwordHash, u.role, u.phone ?? null],
  ) as Promise<UserRow>;

// phone numbers of every admin who has one: the recipients of fleet alerts
export const findAdminPhones = async (): Promise<string[]> =>
  (await query<{ phone: string }>('SELECT phone FROM users WHERE role = $1 AND phone IS NOT NULL', [ROLES.ADMIN])).map(
    (row) => row.phone,
  );