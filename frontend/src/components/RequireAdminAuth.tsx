// src/components/RequireAdminAuth.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { ReactNode } from "react";

/**
 * Protects routes so only ADMIN can access.
 * - Reads auth from AuthProvider via useAuth()
 * - Avoids localStorage/axiosClient direct calls (no stale exports)
 */

export default function RequireAdminAuth({ children }: { children: ReactNode }) {
  const { auth } = useAuth();

  // Not logged in
  if (!auth || !auth.token) {
    return <Navigate to="/admin-login" replace />;
  }

  // Token exists but user not admin
  if (!auth.user || auth.user.role !== "ADMIN") {
    return <Navigate to="/admin-login" replace />;
  }

  // Authorized
  return <>{children}</>;
}
