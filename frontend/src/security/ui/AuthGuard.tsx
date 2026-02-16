import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { SecurityAPI } from "../SecurityAPI";
import { SecurityConfig } from "../SecurityConfig";
import type { UserRole } from "../domain/model/UserRole";

interface AuthGuardProps {
  children: ReactElement;
  roles?: UserRole[];
}

export function AuthGuard({ children, roles }: Readonly<AuthGuardProps>) {
  const location = useLocation();
  const authState = SecurityAPI.getAuthState();

  // Not authenticated → redirect to login
  if (!authState.isAuthenticated) {
    const redirectTo = encodeURIComponent(location.pathname + location.search);

    return (
      <Navigate
        to={`${SecurityConfig.routes.loginPath}?redirect=${redirectTo}`}
        replace
      />
    );
  }

  // === ROLE-BASED ACCESS CONTROL ===
  if (roles && roles.length > 0) {
    const userRoles = authState.user?.roles || [];
    const isAdmin = userRoles.includes("ADMIN");

    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!isAdmin && !hasRequiredRole) {
      return <Navigate to={SecurityConfig.routes.entryPath} replace />;
    }
  }

  // Authorized
  return children;
}
