// src/context/authContext.ts
import { createContext } from "react";
import type { UserSummary } from "../types/User";

export type AuthState = { token: string | null; user: UserSummary | null };

export type AuthContextValue = {
  auth: AuthState;
  login: (token: string, user: UserSummary) => void;
  logout: () => void;
  refreshFromStorage: () => void;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
