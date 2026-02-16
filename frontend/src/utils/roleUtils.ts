// Role Utility Functions
import type { User } from '../types/user';

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (user: User | null, roles: string[]): boolean => {
  if (!user || !user.roles) return false;
  return roles.some(role => user.roles.includes(role));
};

/**
 * Check if user has all of the specified roles
 */
export const hasAllRoles = (user: User | null, roles: string[]): boolean => {
  if (!user || !user.roles) return false;
  return roles.every(role => user.roles.includes(role));
};

/**
 * Check if user has admin role
 */
export const isAdmin = (user: User | null): boolean => {
  return hasAnyRole(user, ['ADMIN', 'admin', 'administrator', 'Administrator']);
};

/**
 * Check if user has forest analyst role
 */
export const isForestAnalyst = (user: User | null): boolean => {
  return hasAnyRole(user, [
    'FOREST_ANALYST',
    'forest-analyst',   // With dash
    'forest_analyst',   // With underscore (YOUR KEYCLOAK ROLE)
    'Forest analyzer',  // Typo version
    'forest analyst',   // Lowercase with space
    'Forest Analyst',   // Title case
    'forestanalyst'     // No space
  ]);
};

/**
 * Check if user has data manager role
 */
export const isDataManager = (user: User | null): boolean => {
  return hasAnyRole(user, [
    'DATA_MANAGER',
    'data-manager',     // With dash
    'data_manager',     // With underscore (YOUR KEYCLOAK ROLE)
    'Data Manager',     // Title case with space
    'data manager',     // Lowercase with space
    'datamanager'       // No space
  ]);
};

/**
 * Check if user has viewer role
 */
export const isViewer = (user: User | null): boolean => {
  return hasAnyRole(user, ['VIEWER', 'viewer', 'Viewer']);
};

/**
 * Get the primary (highest priority) role for display
 */
export const getPrimaryRole = (user: User | null): string => {
  if (!user || !user.roles || user.roles.length === 0) return 'User';

  // Priority order
  if (isAdmin(user)) return 'Administrator';
  if (isDataManager(user)) return 'Datenverwalter';
  if (isForestAnalyst(user)) return 'Waldanalyst';
  if (isViewer(user)) return 'Betrachter';

  // Return first role if no match
  return user.roles[0];
};

/**
 * Check if user can access analysis features
 */
export const canAnalyze = (user: User | null): boolean => {
  return isAdmin(user) || isForestAnalyst(user);
};

/**
 * Check if user can ingest data
 */
export const canIngestData = (user: User | null): boolean => {
  return isAdmin(user) || isDataManager(user);
};

/**
 * Check if user can manage users
 */
export const canManageUsers = (user: User | null): boolean => {
  return isAdmin(user);
};

/**
 * Check if user can view all data
 */
export const canViewAllData = (user: User | null): boolean => {
  return isAdmin(user);
};
