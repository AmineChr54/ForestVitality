/**
 * Tests for utils/apiErrors.ts
 * =============================
 * Verifies error parsing, type guards, and user-friendly messaging.
 *
 * Covers:
 *  - parseApiError()  → Axios errors (known/unknown status, network), plain Errors, unknown objects
 *  - isAxiosError()   → type guard
 *  - isAuthError()    → 401 detection
 *  - isNetworkError() → no-response detection
 *  - getUserFriendlyMessage() / getErrorCode()
 */

import { describe, it, expect } from 'vitest';
import {
  parseApiError,
  isAxiosError,
  isAuthError,
  isNetworkError,
  getUserFriendlyMessage,
  getErrorCode,
} from '../../src/utils/apiErrors';

// ── helpers ──────────────────────────────────────────────────────────
/** Minimal Axios-error-shaped object for testing (no real Axios needed). */
function fakeAxiosError(status: number | null, data?: unknown) {
  return {
    isAxiosError: true,
    message: 'Request failed',
    response: status !== null ? { status, data: data ?? {} } : undefined,
  };
}

// ── parseApiError ────────────────────────────────────────────────────
describe('parseApiError', () => {
  it('returns NETWORK_ERROR when Axios error has no response', () => {
    const err = fakeAxiosError(null);
    const result = parseApiError(err);

    expect(result.isNetworkError).toBe(true);
    expect(result.code).toBe('NETWORK_ERROR');
    expect(result.status).toBe(0);
  });

  it('maps 401 to UNAUTHORIZED with requiresAuth=true', () => {
    const result = parseApiError(fakeAxiosError(401));

    expect(result.code).toBe('UNAUTHORIZED');
    expect(result.requiresAuth).toBe(true);
    expect(result.status).toBe(401);
  });

  it('maps 403 to FORBIDDEN', () => {
    const result = parseApiError(fakeAxiosError(403));

    expect(result.code).toBe('FORBIDDEN');
    expect(result.requiresAuth).toBe(false);
  });

  it('maps 404 to NOT_FOUND', () => {
    const result = parseApiError(fakeAxiosError(404));
    expect(result.code).toBe('NOT_FOUND');
  });

  it('maps 500 to SERVER_ERROR', () => {
    const result = parseApiError(fakeAxiosError(500));
    expect(result.code).toBe('SERVER_ERROR');
  });

  it('uses FastAPI detail string when present', () => {
    const result = parseApiError(
      fakeAxiosError(400, { detail: 'bbox is required' }),
    );

    expect(result.message).toBe('bbox is required');
    expect(result.detail).toBe('bbox is required');
  });

  it('joins FastAPI detail array into comma-separated string', () => {
    const result = parseApiError(
      fakeAxiosError(422, {
        detail: [
          { msg: 'field required', type: 'missing' },
          { msg: 'invalid date', type: 'value_error' },
        ],
      }),
    );

    expect(result.detail).toBe('field required, invalid date');
  });

  it('falls back to UNKNOWN_ERROR for unrecognized status codes', () => {
    const result = parseApiError(fakeAxiosError(418));
    expect(result.code).toBe('UNKNOWN_ERROR');
  });

  it('handles plain Error objects', () => {
    const result = parseApiError(new Error('Something broke'));

    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.message).toBe('Something broke');
    expect(result.isNetworkError).toBe(false);
  });

  it('handles unknown values (string, null, undefined)', () => {
    for (const val of ['oops', null, undefined, 42]) {
      const result = parseApiError(val);
      expect(result.code).toBe('UNKNOWN_ERROR');
    }
  });
});

// ── type guards ──────────────────────────────────────────────────────
describe('isAxiosError', () => {
  it('returns true for Axios-shaped objects', () => {
    expect(isAxiosError(fakeAxiosError(404))).toBe(true);
  });

  it('returns false for plain Error', () => {
    expect(isAxiosError(new Error('nope'))).toBe(false);
  });

  it('returns false for null / undefined', () => {
    expect(isAxiosError(null)).toBe(false);
    expect(isAxiosError(undefined)).toBe(false);
  });
});

describe('isAuthError', () => {
  it('returns true only for 401', () => {
    expect(isAuthError(fakeAxiosError(401))).toBe(true);
  });

  it('returns false for 403', () => {
    expect(isAuthError(fakeAxiosError(403))).toBe(false);
  });

  it('returns false for non-Axios errors', () => {
    expect(isAuthError(new Error('x'))).toBe(false);
  });
});

describe('isNetworkError', () => {
  it('returns true when no response', () => {
    expect(isNetworkError(fakeAxiosError(null))).toBe(true);
  });

  it('returns false when response exists', () => {
    expect(isNetworkError(fakeAxiosError(500))).toBe(false);
  });
});

// ── convenience helpers ──────────────────────────────────────────────
describe('getUserFriendlyMessage', () => {
  it('returns German message for 403', () => {
    const msg = getUserFriendlyMessage(fakeAxiosError(403));
    expect(msg).toContain('Berechtigung');
  });
});

describe('getErrorCode', () => {
  it('returns code string', () => {
    expect(getErrorCode(fakeAxiosError(404))).toBe('NOT_FOUND');
  });
});
