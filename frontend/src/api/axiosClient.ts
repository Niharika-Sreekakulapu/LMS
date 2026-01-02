// src/api/axiosClient.ts
import axios from "axios";
import type { UserSummary } from "../types/User";

const BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:8081";
const STORAGE_KEY = "lms_auth"; // canonical storage
const LEGACY_BASIC_KEY = "basicAuth"; // legacy storage some pages use

// canonical auth shape stored in localStorage
export type AuthData = {
  token: string;
  tokenType?: string;
  expiresAt?: string | null;
  user: UserSummary | null;
};

const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  headers: { Accept: "application/json" },
});

/* -------------------------
   Storage helpers: canonical (token) based
   ------------------------- */

export function saveAuth(token: string, user: UserSummary | null, tokenType?: string, expiresAt?: string | null): void {
  try {
    const payload: AuthData = { token, tokenType, expiresAt, user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("saveAuth: localStorage write failed", err);
  }

  // apply Authorization header using tokenType if provided
  const headerValue = tokenType ? `${tokenType} ${token}` : `Bearer ${token}`;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  client.defaults.headers.common["Authorization"] = headerValue;
}

export function getAuth(): AuthData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthData;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("getAuth: failed to read/parse storage", err);
    return null;
  }
}

export function clearAuth(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_BASIC_KEY);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("clearAuth: localStorage remove failed", err);
  }
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete client.defaults.headers.common["Authorization"];
}

/* -------------------------
   Init: if canonical token saved, set header
   ------------------------- */
const _saved = getAuth();
if (_saved?.token) {
  const headerValue = _saved.tokenType ? `${_saved.tokenType} ${_saved.token}` : `Bearer ${_saved.token}`;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  client.defaults.headers.common["Authorization"] = headerValue;
}

/* -------------------------
   Central response interceptor
   - on 401: clear auth and redirect to /login
   ------------------------- */
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      clearAuth();
      try {
        // use location.href to ensure full page navigation and reset app state
        window.location.href = "/login";
      } catch (redirectErr) {
        // eslint-disable-next-line no-console
        console.warn("Redirect to /login failed", redirectErr);
      }
    }
    return Promise.reject(err);
  }
);

/* -------------------------
   Utility: safe base64 encoding (utf-8 aware)
   ------------------------- */
function base64EncodeUtf8(input: string): string {
  try {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(input);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    // btoa exists in browser environments
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return typeof window !== "undefined" && typeof window.btoa === "function" ? window.btoa(binary) : "";
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("base64EncodeUtf8 failed", err);
    return "";
  }
}

/* -------------------------
   Legacy compatibility shim
   (exports to satisfy old pages)
   ------------------------- */

/**
 * setBasicAuthFromToken(token)
 * - token is expected to be raw base64 string (username:password base64)
 * - sets Authorization: Basic <token> and persists legacy key + canonical token
 */
export function setBasicAuthFromToken(token: string): void {
  try {
    localStorage.setItem(LEGACY_BASIC_KEY, token);
    // maintain canonical payload so new code can pick it up (user unknown in legacy case)
    saveAuth(token, null, "Basic", null);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    client.defaults.headers.common["Authorization"] = `Basic ${token}`;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("setBasicAuthFromToken failed", err);
  }
}

/**
 * setBasicAuth(username, password)
 * - computes base64(username:password) and delegates to setBasicAuthFromToken
 * - kept for legacy pages that still rely on basic auth header
 */
export function setBasicAuth(username: string, password: string): void {
  const raw = `${username}:${password}`;
  const token = base64EncodeUtf8(raw);
  if (!token) {
    // eslint-disable-next-line no-console
    console.warn("setBasicAuth: base64 encoding failed");
    return;
  }
  setBasicAuthFromToken(token);
}

/**
 * getStoredBase64Token()
 * - returns legacy token if present, else canonical token fallback
 */
export function getStoredBase64Token(): string | null {
  try {
    const leg = localStorage.getItem(LEGACY_BASIC_KEY);
    if (leg) return leg;
    const canon = getAuth();
    return canon?.token ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("getStoredBase64Token failed", err);
    return null;
  }
}

/**
 * getBasicAuthObject() - optional helper older code may use
 */
export function getBasicAuthObject(): { token: string } | null {
  const t = getStoredBase64Token();
  return t ? { token: t } : null;
}

/* default axios client export */
export default client;
