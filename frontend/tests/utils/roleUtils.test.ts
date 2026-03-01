/**
 * Tests for utils/roleUtils.ts
 * =============================
 * Verifies role checking, permission helpers, and display-name mapping.
 *
 * Covers:
 *  - hasAnyRole / hasAllRoles
 *  - isAdmin, isForestAnalyst, isDataManager, isViewer  (all alias variants)
 *  - getPrimaryRole  (German display names, priority order)
 *  - canAnalyze, canIngestData, canManageUsers, canViewAllData
 */

import { describe, it, expect } from 'vitest';
import {
  hasAnyRole,
  hasAllRoles,
  isAdmin,
  isForestAnalyst,
  isDataManager,
  isViewer,
  getPrimaryRole,
  canAnalyze,
  canIngestData,
  canManageUsers,
  canViewAllData,
} from '../../src/utils/roleUtils';
import type { User } from '../../src/types/user';

// ── helper ───────────────────────────────────────────────────────────
function user(roles: string[]): User {
  return { id: '1', email: 'a@b.de', name: 'Test', roles, createdAt: '' };
}

// ── hasAnyRole / hasAllRoles ─────────────────────────────────────────
describe('hasAnyRole', () => {
  it('returns true when at least one role matches', () => {
    expect(hasAnyRole(user(['viewer', 'admin']), ['admin'])).toBe(true);
  });

  it('returns false when none match', () => {
    expect(hasAnyRole(user(['viewer']), ['admin'])).toBe(false);
  });

  it('returns false for null user', () => {
    expect(hasAnyRole(null, ['admin'])).toBe(false);
  });
});

describe('hasAllRoles', () => {
  it('returns true when all roles present', () => {
    expect(hasAllRoles(user(['admin', 'viewer']), ['admin', 'viewer'])).toBe(true);
  });

  it('returns false when one is missing', () => {
    expect(hasAllRoles(user(['admin']), ['admin', 'viewer'])).toBe(false);
  });
});

// ── role detectors (alias variants) ─────────────────────────────────
describe('isAdmin', () => {
  it.each(['ADMIN', 'admin', 'Administrator', 'administrator'])(
    'recognises "%s"',
    (role) => expect(isAdmin(user([role]))).toBe(true),
  );

  it('returns false for non-admin roles', () => {
    expect(isAdmin(user(['viewer']))).toBe(false);
  });
});

describe('isForestAnalyst', () => {
  it.each([
    'FOREST_ANALYST',
    'forest-analyst',
    'forest_analyst',
    'Forest analyzer',
    'forest analyst',
    'Forest Analyst',
    'forestanalyst',
  ])('recognises "%s"', (role) => {
    expect(isForestAnalyst(user([role]))).toBe(true);
  });
});

describe('isDataManager', () => {
  it.each([
    'DATA_MANAGER',
    'data-manager',
    'data_manager',
    'Data Manager',
    'data manager',
    'datamanager',
  ])('recognises "%s"', (role) => {
    expect(isDataManager(user([role]))).toBe(true);
  });
});

describe('isViewer', () => {
  it.each(['VIEWER', 'viewer', 'Viewer'])(
    'recognises "%s"',
    (role) => expect(isViewer(user([role]))).toBe(true),
  );
});

// ── getPrimaryRole (German labels, priority order) ───────────────────
describe('getPrimaryRole', () => {
  it('returns Administrator for admin', () => {
    expect(getPrimaryRole(user(['admin']))).toBe('Administrator');
  });

  it('returns Datenverwalter for data manager', () => {
    expect(getPrimaryRole(user(['data_manager']))).toBe('Datenverwalter');
  });

  it('returns Waldanalyst for forest analyst', () => {
    expect(getPrimaryRole(user(['forest_analyst']))).toBe('Waldanalyst');
  });

  it('returns Betrachter for viewer', () => {
    expect(getPrimaryRole(user(['viewer']))).toBe('Betrachter');
  });

  it('prefers admin > data_manager when both present', () => {
    expect(getPrimaryRole(user(['data_manager', 'admin']))).toBe('Administrator');
  });

  it('falls back to first role for unknown roles', () => {
    expect(getPrimaryRole(user(['custom-role']))).toBe('custom-role');
  });

  it('returns "User" for null user', () => {
    expect(getPrimaryRole(null)).toBe('User');
  });
});

// ── permission helpers ───────────────────────────────────────────────
describe('canAnalyze', () => {
  it('allows admin', () => expect(canAnalyze(user(['admin']))).toBe(true));
  it('allows forest analyst', () => expect(canAnalyze(user(['forest_analyst']))).toBe(true));
  it('denies viewer', () => expect(canAnalyze(user(['viewer']))).toBe(false));
});

describe('canIngestData', () => {
  it('allows admin', () => expect(canIngestData(user(['admin']))).toBe(true));
  it('allows data manager', () => expect(canIngestData(user(['data_manager']))).toBe(true));
  it('denies viewer', () => expect(canIngestData(user(['viewer']))).toBe(false));
});

describe('canManageUsers', () => {
  it('allows only admin', () => {
    expect(canManageUsers(user(['admin']))).toBe(true);
    expect(canManageUsers(user(['data_manager']))).toBe(false);
  });
});

describe('canViewAllData', () => {
  it('allows only admin', () => {
    expect(canViewAllData(user(['admin']))).toBe(true);
    expect(canViewAllData(user(['viewer']))).toBe(false);
  });
});
