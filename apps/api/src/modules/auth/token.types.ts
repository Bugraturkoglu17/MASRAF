export interface AccessTokenPayload {
  sub: string;
  organizationId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}
