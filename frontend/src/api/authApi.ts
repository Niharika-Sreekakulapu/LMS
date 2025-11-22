// src/api/authApi.ts
import client from "./axiosClient";

// User login
export const login = (payload: { email: string; password: string }) =>
  client.post("/auth/login", payload);

// User registration
export const register = (payload: {
  name: string;
  email: string;
  phone: string;
  role: string;
  password: string;
}) => client.post("/auth/register", payload);
