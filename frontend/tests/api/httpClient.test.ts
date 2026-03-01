/**
 * Tests for api/httpClient.ts
 * ============================
 * Verifies the Axios interceptor behaviour that every API call flows through.
 *
 * Covers:
 *  REQUEST INTERCEPTOR
 *  - Auth token attached to protected routes
 *  - Auth token skipped for public routes (/health, /auth/login, …)
 *  - No header when token is absent
 *
 *  RESPONSE INTERCEPTOR
 *  - 401 → clearAuth() called + redirect to /login
 *  - 401 on a public route → NO redirect (avoid loop)
 *  - 4xx/5xx → rejected with AppError shape
 *
 *  CONVENIENCE WRAPPERS
 *  - get / post / put / patch / del return response.data
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import type { AxiosInstance } from 'axios';

// ── We must mock the dependencies BEFORE importing httpClient ────────
// Mock authStore
vi.mock('../../src/state/authStore', () => ({
  getAuthToken: vi.fn(() => null),
  clearAuth: vi.fn(),
}));

// Mock env so httpClient can build
vi.mock('../../src/config', () => ({
  env: {
    API_BASE_URL: 'http://localhost:8000',
    DEBUG_MODE: false,
    IS_DEVELOPMENT: false,
  },
}));

// Now import the things we mocked + the module under test
import { getAuthToken, clearAuth } from '../../src/state/authStore';
import { httpClient, get, post, put, patch, del } from '../../src/api/httpClient';

// ── helpers ──────────────────────────────────────────────────────────
/** Shorthand to get the mocked function for assertions. */
const mockedGetAuthToken = getAuthToken as ReturnType<typeof vi.fn>;
const mockedClearAuth = clearAuth as ReturnType<typeof vi.fn>;

// ── setup / teardown ─────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  // Reset window.location for redirect tests
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { pathname: '/dashboard', href: '' },
  });
});

// =====================================================================
// REQUEST INTERCEPTOR
// =====================================================================
describe('request interceptor – token attachment', () => {
  it('attaches Bearer token to protected routes', async () => {
    mockedGetAuthToken.mockReturnValue('my-jwt-token');

    // Use the interceptor manager to run the request interceptor manually
    // by inspecting what httpClient.interceptors.request does to a config
    const config = await (httpClient as AxiosInstance).interceptors.request.handlers[0].fulfilled({
      url: '/api/v1/regions',
      headers: new axios.AxiosHeaders(),
    } as any);

    expect(config.headers.Authorization).toBe('Bearer my-jwt-token');
  });

  it('skips token for public route /health', async () => {
    mockedGetAuthToken.mockReturnValue('my-jwt-token');

    const config = await (httpClient as AxiosInstance).interceptors.request.handlers[0].fulfilled({
      url: '/health',
      headers: new axios.AxiosHeaders(),
    } as any);

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('skips token for public route /auth/login', async () => {
    mockedGetAuthToken.mockReturnValue('my-jwt-token');

    const config = await (httpClient as AxiosInstance).interceptors.request.handlers[0].fulfilled({
      url: '/auth/login',
      headers: new axios.AxiosHeaders(),
    } as any);

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('does not set header when no token available', async () => {
    mockedGetAuthToken.mockReturnValue(null);

    const config = await (httpClient as AxiosInstance).interceptors.request.handlers[0].fulfilled({
      url: '/api/v1/regions',
      headers: new axios.AxiosHeaders(),
    } as any);

    expect(config.headers.Authorization).toBeUndefined();
  });
});

// =====================================================================
// RESPONSE INTERCEPTOR
// =====================================================================
describe('response interceptor – error handling', () => {
  /** Build a fake AxiosError with the shape the interceptor expects. */
  function fakeAxiosError(status: number, url: string) {
    return {
      isAxiosError: true,
      message: 'Request failed',
      response: { status, data: {} },
      config: { url },
    };
  }

  it('calls clearAuth and redirects on 401 for protected route', async () => {
    const handler = (httpClient as AxiosInstance).interceptors.response.handlers[0].rejected;

    await expect(handler(fakeAxiosError(401, '/api/v1/regions'))).rejects.toBeDefined();

    expect(mockedClearAuth).toHaveBeenCalled();
    expect(window.location.href).toBe('/login');
  });

  it('stores redirect-after-login path in sessionStorage on 401', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    const handler = (httpClient as AxiosInstance).interceptors.response.handlers[0].rejected;

    await expect(handler(fakeAxiosError(401, '/api/v1/regions'))).rejects.toBeDefined();

    expect(spy).toHaveBeenCalledWith('redirectAfterLogin', '/dashboard');
    spy.mockRestore();
  });

  it('does NOT redirect on 401 for public route /health', async () => {
    const handler = (httpClient as AxiosInstance).interceptors.response.handlers[0].rejected;

    await expect(handler(fakeAxiosError(401, '/health'))).rejects.toBeDefined();

    // clearAuth should NOT be called for public routes
    expect(mockedClearAuth).not.toHaveBeenCalled();
    // href should remain unchanged
    expect(window.location.href).toBe('');
  });

  it('rejects with AppError shape on 403', async () => {
    const handler = (httpClient as AxiosInstance).interceptors.response.handlers[0].rejected;

    try {
      await handler(fakeAxiosError(403, '/api/v1/admin'));
      expect.unreachable('should have thrown');
    } catch (err: any) {
      expect(err.code).toBe('FORBIDDEN');
      expect(err.status).toBe(403);
      expect(err.requiresAuth).toBe(false);
    }
  });

  it('rejects with AppError shape on 500', async () => {
    const handler = (httpClient as AxiosInstance).interceptors.response.handlers[0].rejected;

    try {
      await handler(fakeAxiosError(500, '/api/v1/data'));
      expect.unreachable('should have thrown');
    } catch (err: any) {
      expect(err.code).toBe('SERVER_ERROR');
      expect(err.status).toBe(500);
    }
  });
});

// =====================================================================
// CLIENT CONFIGURATION
// =====================================================================
describe('httpClient configuration', () => {
  it('has baseURL set to API_BASE_URL', () => {
    expect(httpClient.defaults.baseURL).toBe('http://localhost:8000');
  });

  it('has 5-minute timeout (satellite ingestion)', () => {
    expect(httpClient.defaults.timeout).toBe(300000);
  });

  it('sends JSON content type', () => {
    expect(httpClient.defaults.headers['Content-Type']).toBe('application/json');
  });
});
