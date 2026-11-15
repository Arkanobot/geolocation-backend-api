import type { Role } from '../../../shared/constants';

// shape of a row in the users table
export type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  phone: string | null;
  created_at: Date;
};

// what the API returns
export type UserDto = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  createdAt: Date;
};

export type RegisterInput = { name: string; email: string; password: string; phone?: string };
export type LoginInput = { email: string; password: string };