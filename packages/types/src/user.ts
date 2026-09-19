export type UserRole = "USER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  role: UserRole;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Shape returned to clients — never includes passwordHash or internal fields. */
export type AuthUser = User;

export interface AuthTokens {
  accessToken: string;
  /**
   * Only present in API responses to the mobile client, which cannot rely on
   * browser cookies. The web client receives the refresh token exclusively
   * via an HTTP-only cookie and this field is omitted for it.
   */
  refreshToken?: string;
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
}
