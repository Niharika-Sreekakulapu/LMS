// src/context/AuthProvider.tsx
import React, { useState, useCallback, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import type { UserSummary } from "../types/User";
import client from "../api/axiosClient";

const STORAGE_KEY = "lms_auth";

function loadFromStorage(): { token: string; user: UserSummary } | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { token: string; user: UserSummary };
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const stored = loadFromStorage();
  const [auth, setAuth] = useState(() => ({
    token: stored?.token ?? null,
    user: stored?.user ?? null,
  }));

  const login = useCallback((token: string, user: UserSummary) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setAuth({ token, user });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    delete client.defaults.headers.common["Authorization"];
    setAuth({ token: null, user: null });
    window.location.href = "/login";
  }, []);

  const refreshFromStorage = useCallback(() => {
    const s = loadFromStorage();
    if (s) {
      client.defaults.headers.common["Authorization"] = `Bearer ${s.token}`;
      setAuth({ token: s.token, user: s.user });
    } else {
      setAuth({ token: null, user: null });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (auth.token) {
      try {
        const response = await client.get('/api/auth/profile');
        const freshUser = response.data;
        const updatedAuth = { token: auth.token, user: freshUser };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAuth));
        setAuth(updatedAuth);
      } catch (error) {
        console.error('Failed to refresh user data:', error);
      }
    }
  }, [auth.token]);

  // Sync auth state when localStorage changes (from other tabs or external updates)
  useEffect(() => {
    const handleStorageChange = () => {
      refreshFromStorage();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refreshFromStorage]);

  // Provide a stable object reference so consumers don't re-render unnecessarily
  const value = React.useMemo(
    () => ({ auth, login, logout, refreshFromStorage, refreshUser }),
    [auth, login, logout, refreshFromStorage, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
