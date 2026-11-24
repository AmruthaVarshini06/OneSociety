export type Role =
  | 'resident'
  | 'president'
  | 'guard'
  | 'supplier'
  | 'provider_internal'
  | 'provider_external'
  | 'delivery_partner';

export interface AuthUser {
  userId: string;
  role: Role;
  societyId: string;
  mustChangePassword: boolean;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
