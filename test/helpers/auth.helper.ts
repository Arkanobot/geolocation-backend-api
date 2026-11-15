import { hash } from 'bcryptjs';
import { signToken } from '../../src/backend/auth/jwt';
import { insertUser, toUserDto } from '../../src/backend/modules/users';
import { ROLES, type Role } from '../../src/shared/constants';

let counter = 0;

// inserts a user straight into the DB and returns a ready-to-use JWT
export const createTestUser = async (role: Role = ROLES.OPERATOR) => {
  const email = `${role}${++counter}@test.com`;
  const password = 'Password123';
  const row = await insertUser({
    name: `Test ${role}`,
    email,
    passwordHash: await hash(password, 4), 
    role,
    phone: '+919876543210',
  });
  const token = signToken({ id: row.id, email: row.email, role: row.role });
  return { user: toUserDto(row), email, password, token };
};