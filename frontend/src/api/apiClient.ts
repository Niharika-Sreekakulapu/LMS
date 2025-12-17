// src/api/apiClient.ts
import axios from "axios";
import type { AxiosRequestConfig, AxiosRequestHeaders } from "axios";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_BASE ??
  "http://localhost:8081/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

/**
 * Convert AxiosRequestConfig['headers'] into a string map safely without `any`.
 */
function headersToRecord(h?: AxiosRequestConfig["headers"]): Record<string, string> {
  if (!h) return {};

  if (typeof h === "string") {
    return { header: h };
  }

  const result: Record<string, string> = {};
  const obj = h as unknown;

  if (obj && typeof (obj as { toJSON?: () => unknown }).toJSON === "function") {
    try {
      const j = (obj as { toJSON: () => unknown }).toJSON();
      if (j && typeof j === "object") {
        const map = j as Record<string, unknown>;
        for (const key of Object.keys(map)) {
          const v = map[key];
          if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
            result[key] = String(v);
          }
        }
        return result;
      }
    } catch {
      // fallthrough to generic object handling
    }
  }

  try {
    const map = obj as Record<string, unknown>;
    for (const key of Object.keys(map || {})) {
      const v = map[key];
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        result[key] = String(v);
      } else if (v && typeof (v as { toString?: () => string }).toString === "function") {
        try {
          result[key] = String((v as { toString: () => string }).toString());
        } catch {
          // skip non-serializable
        }
      }
    }
  } catch {
    return {};
  }

  return result;
}

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem("lms_auth");

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { token?: string; tokenType?: string } | null;
      if (parsed && parsed.token) {
        const prev = headersToRecord(config.headers);
        const merged: Record<string, string> = {
          ...prev,
          Authorization: `${parsed.tokenType ?? "Bearer"} ${parsed.token}`,
        };
        // Cast through unknown to the AxiosRequestHeaders type (no `any`)
        config.headers = (merged as unknown) as AxiosRequestHeaders;
      }
    } catch (err) {
      // visible dev-time warning only
      console.warn("apiClient: malformed lms_auth in localStorage", err);
    }
  }

  return config;
});

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const payload = error?.response?.data;
    const status: number = error?.response?.status ?? 0;
    const message: string =
      (payload && (payload.message || payload.error)) ||
      error.message ||
      "Unknown error";

    return Promise.reject({
      status,
      message,
      raw: payload,
    });
  }
);

export default api;
export { API_BASE };
