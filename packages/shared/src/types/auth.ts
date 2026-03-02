/**
 * Authentication and JWT types
 */

/**
 * JWT payload claims
 */
export interface JWTPayload {
  name: string; // username
  group: string | null;
  groupID: number | null; // numeric group id
  userID: number; // numeric user id
  email: string | null;
  image: string | null;
  iat?: number; // issued at
  exp?: number; // expiration time
}

/**
 * Login request
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Login response - contains JWT token
 */
export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string | null;
    group: string | null;
    group_id: number | null;
    image: string | null;
  };
}

/**
 * Current authentication state
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: number;
    username: string;
    email: string | null;
    group: string | null;
    group_id: number | null;
    image: string | null;
  } | null;
  token: string | null;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  token: string;
}
