export type AppRole = 'USER' | 'MANAGER' | 'ADMIN';

export interface AccessTokenPayload {
  sub: string;
  organizationId: string;
  email: string;
  role: AppRole;
  roles: string[];
  permissions: string[];
  profileCompleted: boolean;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}
