import { compare, hash } from 'bcryptjs';
import { ERROR_CODES } from '../../../shared/constants';
import { ROLES } from '../../../shared/constants';
import { createHttpError } from '../../../shared/helpers';
import { isUniqueViolation } from '../../db';
import { signToken } from '../../auth/jwt';
import { findUserByEmail, findUserById, insertUser } from './users.repository';
import type { LoginInput, RegisterInput, UserDto, UserRow } from './users.types';

const BCRYPT_ROUNDS = 10;

export const toUserDto = (row: UserRow): UserDto => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  phone: row.phone,
  createdAt: row.created_at,
});

// public registration always creates an operator; admins are created with `npm run seed:admin`
export const registerUser = async (input: RegisterInput): Promise<UserDto> => {
  try {
    const row = await insertUser({
      name: input.name,
      email: input.email,
      passwordHash: await hash(input.password, BCRYPT_ROUNDS),
      role: ROLES.OPERATOR,
      phone: input.phone ?? null,
    });
    return toUserDto(row);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw createHttpError(409, ERROR_CODES.CONFLICT, 'A user with this email already exists');
    }
    throw err;
  }
};

export const loginUser = async ({ email, password }: LoginInput) => {
  const row = await findUserByEmail(email);
  // same message for unknown email and wrong password, so emails can't be found out by brute force
  if (!row || !(await compare(password, row.password_hash))) {
    throw createHttpError(401, ERROR_CODES.UNAUTHORIZED, 'Invalid email or password');
  }
  const token = signToken({ id: row.id, email: row.email, role: row.role });
  return { token, user: toUserDto(row) };
};

export const getProfile = async (userId: string): Promise<UserDto> => {
  const row = await findUserById(userId);
  if (!row) throw createHttpError(401, ERROR_CODES.UNAUTHORIZED, 'User no longer exists');
  return toUserDto(row);
};