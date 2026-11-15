export const ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const isRole = (value: unknown): value is Role =>
  Object.values(ROLES).includes(value as Role);