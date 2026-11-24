export const ROLES = [
  'resident',
  'president',
  'guard',
  'supplier',
  'provider_internal',
  'provider_external',
  'delivery_partner',
] as const;

export type Role = (typeof ROLES)[number];
