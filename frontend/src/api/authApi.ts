// src/api/authApi.ts
import client from "./axiosClient";
import type { RegistrationRequest } from "../types/dto";

/* ------------------ REGISTER USER ------------------ */
/** Accepts FormData (for file upload) OR RegistrationRequest JSON payload */
export const register = (payload: FormData | RegistrationRequest) => {
  if (typeof FormData !== "undefined" && payload instanceof FormData) {
    return client.post("/api/auth/register", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }

  // JSON registration (no file)
  return client.post("/api/auth/register", payload);
};

/* -------------------- LOGIN USER -------------------- */
export interface LoginRequest {
  email: string;
  password: string;
  role?: string;
}
export const login = (payload: LoginRequest) =>
  client.post("/api/auth/login", payload);

/* -------------- FORGOT / RESET PASSWORD -------------- */
export const forgotPassword = (payload: { email: string }) =>
  client.post("/api/auth/forgot-password", payload);

export const resetPassword = (payload: { token: string; newPassword: string }) =>
  client.post("/api/auth/reset-password", payload);

/* --------------------- PROFILE ----------------------- */
export const getProfile = () => client.get("/api/auth/profile");

export const updateProfile = (updates: Record<string, unknown>) =>
  client.put("/api/auth/profile", updates);
