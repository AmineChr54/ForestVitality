/**
 * HTTP Client
 * ===========
 * Centralized Axios instance with authentication and error handling.
 * 
 * Features:
 * - Automatic auth token attachment
 * - 401 handling with redirect to login
 * - Standardized error transformation
 * - Request/response logging in development
 * 
 * Usage:
 *   import { httpClient } from '@/api/httpClient';
 *   
 *   // GET request
 *   const response = await httpClient.get('/endpoint');
 *   
 *   // POST request with data
 *   const response = await httpClient.post('/endpoint', { data });
 */

import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { env } from '../config';
import { getAuthToken, clearAuth } from '../state/authStore';
import { parseApiError, logApiError, type AppError } from '../utils/apiErrors';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT = 300000; // 5 minutes (for satellite ingestion)

// ---------------------------------------------------------------------------
// Routes Configuration
// ---------------------------------------------------------------------------

/**
 * Routes that don't require authentication
 */
const PUBLIC_ROUTES = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/health',
    '/os-health',
];

/**
 * Check if a route is public (doesn't need auth token)
 */
function isPublicRoute(url: string | undefined): boolean {
    if (!url) return false;
    return PUBLIC_ROUTES.some(route => url.includes(route));
}

// ---------------------------------------------------------------------------
// Client Configuration
// ---------------------------------------------------------------------------

/**
 * Create and configure the Axios instance
 */
function createHttpClient(): AxiosInstance {
    const client = axios.create({
        baseURL: env.API_BASE_URL,
        timeout: REQUEST_TIMEOUT,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    });

    // Request interceptor
    client.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            // Attach auth token if available and route requires it
            if (!isPublicRoute(config.url)) {
                const token = getAuthToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }

            // Log request in development
            if (env.DEBUG_MODE) {
                console.log(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`, config.params || '');
            }

            return config;
        },
        (error: AxiosError) => {
            return Promise.reject(error);
        }
    );

    // Response interceptor
    client.interceptors.response.use(
        (response: AxiosResponse) => {
            // Log successful response in development
            if (env.DEBUG_MODE) {
                console.log(`[HTTP] Response ${response.status}:`, response.config.url);
            }

            return response;
        },
        async (error: AxiosError) => {
            const appError = parseApiError(error);

            // Log error
            logApiError(appError, 'httpClient');

            // Handle 401 Unauthorized
            if (appError.requiresAuth && !isPublicRoute(error.config?.url)) {
                handleUnauthorized();
            }

            // Transform error and reject
            return Promise.reject(appError);
        }
    );

    return client;
}

// ---------------------------------------------------------------------------
// Auth Handling
// ---------------------------------------------------------------------------

/**
 * Handle 401 Unauthorized response
 * - Clear auth state
 * - Redirect to login page
 */
function handleUnauthorized(): void {
    // Clear auth state
    clearAuth();

    // Redirect to login (only in browser context)
    if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const loginPath = '/login';

        // Only redirect if not already on login page
        if (currentPath !== loginPath) {
            // Store the intended destination for redirect after login
            sessionStorage.setItem('redirectAfterLogin', currentPath);

            // Redirect to login
            window.location.href = loginPath;
        }
    }
}



// ---------------------------------------------------------------------------
// Export Client Instance
// ---------------------------------------------------------------------------

/**
 * Main HTTP client instance
 * Use this for all API calls
 */
export const httpClient = createHttpClient();

// ---------------------------------------------------------------------------
// Convenience Methods
// ---------------------------------------------------------------------------

/**
 * Type-safe GET request
 */
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await httpClient.get<T>(url, { params });
    return response.data;
}

/**
 * Type-safe POST request
 */
export async function post<T, D = unknown>(url: string, data?: D): Promise<T> {
    const response = await httpClient.post<T>(url, data);
    return response.data;
}

/**
 * Type-safe PUT request
 */
export async function put<T, D = unknown>(url: string, data?: D): Promise<T> {
    const response = await httpClient.put<T>(url, data);
    return response.data;
}

/**
 * Type-safe PATCH request
 */
export async function patch<T, D = unknown>(url: string, data?: D): Promise<T> {
    const response = await httpClient.patch<T>(url, data);
    return response.data;
}

/**
 * Type-safe DELETE request
 */
export async function del<T>(url: string): Promise<T> {
    const response = await httpClient.delete<T>(url);
    return response.data;
}

// ---------------------------------------------------------------------------
// Re-export Error Types
// ---------------------------------------------------------------------------

export type { AppError };
