/**
 * JWT Token utilities for parsing user information
 */

interface JWTPayload {
  sub: string; // username
  userId: number;
  role: string; // ADMIN, BUSINESS, CUSTOMER
  iat: number;
  exp: number;
}

/**
 * Decode JWT token without verification (client-side only)
 * Server will verify the token
 */
export function parseJWT(token: string): JWTPayload | null {
  try {
    // JWT structure: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[JWT] Invalid token format');
      return null;
    }

    // Decode base64url payload
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const decoded = JSON.parse(jsonPayload) as JWTPayload;
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      console.error('[JWT] Token expired');
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('[JWT] Failed to parse token:', error);
    return null;
  }
}

/**
 * Get user role from JWT token
 */
export function getUserRole(token: string): string | null {
  const payload = parseJWT(token);
  return payload?.role || null;
}

/**
 * Get user ID from JWT token
 */
export function getUserId(token: string): number | null {
  const payload = parseJWT(token);
  return payload?.userId || null;
}

/**
 * Check if user is ADMIN
 */
export function isAdmin(token: string): boolean {
  return getUserRole(token) === 'ADMIN';
}

/**
 * Check if user is BUSINESS
 */
export function isBusiness(token: string): boolean {
  return getUserRole(token) === 'BUSINESS';
}

/**
 * Check if user is CUSTOMER
 */
export function isCustomer(token: string): boolean {
  return getUserRole(token) === 'CUSTOMER';
}
