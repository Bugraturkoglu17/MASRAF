export type AppRole = 'USER' | 'MANAGER' | 'ADMIN';

export interface AccessTokenPayload {
  sub: string;
  organizationId: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}
