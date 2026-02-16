// Role-Based Route Guard Component
import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks";
import { hasAnyRole, hasAllRoles } from "../../utils/roleUtils";

interface RoleGuardProps {
  children: ReactElement;
  allowedRoles?: string[];
  requiredRoles?: string[];  // Must have ALL these roles
  fallbackPath?: string;
  showMessage?: boolean;
}

/**
 * RoleGuard - Protects routes based on user roles
 * 
 * Usage:
 *   <RoleGuard allowedRoles={['ADMIN', 'DATA_MANAGER']}>
 *     <DataIngestionPage />
 *   </RoleGuard>
 */
export function RoleGuard({ 
  children, 
  allowedRoles = [],
  requiredRoles = [],
  fallbackPath = '/dashboard',
  showMessage = true 
}: Readonly<RoleGuardProps>) {
  const { user, isAuthenticated } = useAuth();

  // Not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check required roles (must have ALL)
  if (requiredRoles.length > 0 && !hasAllRoles(user, requiredRoles)) {
    return showMessage ? (
      <AccessDenied requiredRoles={requiredRoles} />
    ) : (
      <Navigate to={fallbackPath} replace />
    );
  }

  // Check allowed roles (must have ANY)
  if (allowedRoles.length > 0 && !hasAnyRole(user, allowedRoles)) {
    return showMessage ? (
      <AccessDenied requiredRoles={allowedRoles} />
    ) : (
      <Navigate to={fallbackPath} replace />
    );
  }

  return children;
}


// Access Denied Message Component
function AccessDenied({ requiredRoles }: { requiredRoles: string[] }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        padding: '2rem',
        maxWidth: '500px'
      }}>
        <h2 style={{ color: '#856404' }}>🔒 Zugriff verweigert</h2>
        <p style={{ color: '#856404', marginBottom: '1rem' }}>
          Sie haben keine Berechtigung, auf diese Seite zuzugreifen.
        </p>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Erforderliche Rolle(n): <strong>{requiredRoles.join(', ')}</strong>
        </p>
        <button
          onClick={() => window.history.back()}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Zurück
        </button>
      </div>
    </div>
  );
}
