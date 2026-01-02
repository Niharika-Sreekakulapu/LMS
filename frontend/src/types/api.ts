// src/types/api.ts
export type Role = "STUDENT" | "LIBRARIAN" | "ADMIN";

export interface LoginResponse {
  token: string;
  tokenType?: string;
  expiresAt?: string;
  user?: {
    id: number;
    name?: string;
    email?: string;
    roles?: Role[] | string[];
  };
}
