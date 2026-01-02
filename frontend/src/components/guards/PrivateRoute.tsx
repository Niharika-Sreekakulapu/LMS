// src/components/guards/PrivateRoute.tsx
import { Navigate } from "react-router-dom";
import { getAuth, getUserRoles } from "../../services/authService";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  roles?: string[]; // allowed roles (uppercase preferred: "LIBRARIAN","ADMIN","STUDENT")
};

export default function PrivateRoute({ children, roles }: Props) {
  const auth = getAuth();
  if (!auth) return <Navigate to="/login" replace />;

  if (roles && roles.length > 0) {
    const r = getUserRoles();
    const ok = roles.some((role) => r.includes(role.toUpperCase()));
    if (!ok) return <div>Access denied</div>;
  }

  // children is a ReactNode — render as-is
  return <>{children}</>;
}
