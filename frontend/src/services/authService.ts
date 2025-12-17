// src/services/authService.ts
export type UserSummary = {
  id: number;
  name?: string;
  email?: string;
  role?: string; // backend returns single role as string
};

export type AuthData = {
  token: string;
  tokenType?: string;
  expiresAt?: string | null;
  user?: UserSummary | null;
};

const STORAGE_KEY = "lms_auth";

/**
 * Return the parsed auth payload or null.
 */
export function getAuth(): AuthData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthData;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("authService.getAuth: failed to parse storage", err);
    return null;
  }
}

/**
 * Save an auth payload. Use the same canonical shape used elsewhere.
 */
export function saveAuth(token: string, user: UserSummary | null, tokenType?: string, expiresAt?: string | null): void {
  try {
    const payload: AuthData = { token, tokenType, expiresAt, user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("authService.saveAuth: failed to write storage", err);
  }
}

/** Remove stored auth */
export function clearAuth(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("authService.clearAuth: failed to remove storage", err);
  }
}

/**
 * Return user roles as an array of uppercase strings (defensive).
 * If there is no user or role, returns empty array.
 */
export function getUserRoles(): string[] {
  const auth = getAuth();
  const role = auth?.user?.role;
  if (!role || typeof role !== "string") return [];
  return [role.toUpperCase()];
}

/** Convenience */
export function isLoggedIn(): boolean {
  return !!getAuth();
}
