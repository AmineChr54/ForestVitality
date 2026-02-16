// Permission-Based Component Rendering
import type { ReactNode } from 'react';
import { useAuth } from '../../hooks';
import type { User } from '../../types/user';

interface CanProps {
  children: ReactNode;
  perform: (user: User | null) => boolean;
  fallback?: ReactNode;
}

/**
 * Can - Conditionally render based on permissions
 * 
 * Usage:
 *   <Can perform={canAnalyze}>
 *     <RunAnalysisButton />
 *   </Can>
 */
export function Can({ children, perform, fallback = null }: CanProps) {
  const { user } = useAuth();
  
  if (perform(user)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}


interface CannotProps {
  children: ReactNode;
  perform: (user: User | null) => boolean;
}

/**
 * Cannot - Render only if user CANNOT perform action
 * 
 * Usage:
 *   <Cannot perform={canAnalyze}>
 *     <div className="alert">You don't have permission to analyze</div>
 *   </Cannot>
 */
export function Cannot({ children, perform }: CannotProps) {
  const { user } = useAuth();
  
  if (!perform(user)) {
    return <>{children}</>;
  }
  
  return null;
}


// Pre-built permission components for common cases
export function AdminOnly({ children }: { children: ReactNode }) {
  return (
    <Can perform={(user) => user?.roles.includes('ADMIN') || false}>
      {children}
    </Can>
  );
}

export function AnalystOnly({ children }: { children: ReactNode }) {
  return (
    <Can perform={(user) => 
      user?.roles.includes('ADMIN') || 
      user?.roles.includes('FOREST_ANALYST') || false
    }>
      {children}
    </Can>
  );
}

export function DataManagerOnly({ children }: { children: ReactNode }) {
  return (
    <Can perform={(user) => 
      user?.roles.includes('ADMIN') || 
      user?.roles.includes('DATA_MANAGER') || false
    }>
      {children}
    </Can>
  );
}
