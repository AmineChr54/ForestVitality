/**
 * API Error Utilities
 * ====================
 * Standardized error handling for API responses.
 * 
 * This module provides:
 * - Error message mapping by HTTP status code
 * - User-friendly error messages in German/English
 * - Error logging utilities
 * - Error type guards
 */

import { AxiosError } from 'axios';
import { env } from '../config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * FastAPI standard error response format
 */
export interface FastAPIError {
    detail: string | { msg: string; type: string }[];
}

/**
 * Standardized application error
 */
export interface AppError {
    /** HTTP status code */
    status: number;

    /** Error code for programmatic handling */
    code: string;

    /** User-friendly message */
    message: string;

    /** Original error detail from API */
    detail?: string;

    /** Whether this is a network error (no response) */
    isNetworkError: boolean;

    /** Whether this requires re-authentication */
    requiresAuth: boolean;
}

// ---------------------------------------------------------------------------
// Error Messages by Status Code
// ---------------------------------------------------------------------------

const ERROR_MESSAGES: Record<number, { code: string; message: string }> = {
    400: {
        code: 'BAD_REQUEST',
        message: 'Die Anfrage war ungültig. Bitte überprüfen Sie Ihre Eingaben.',
    },
    401: {
        code: 'UNAUTHORIZED',
        message: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
    },
    403: {
        code: 'FORBIDDEN',
        message: 'Sie haben keine Berechtigung für diese Aktion.',
    },
    404: {
        code: 'NOT_FOUND',
        message: 'Die angeforderte Ressource wurde nicht gefunden.',
    },
    409: {
        code: 'CONFLICT',
        message: 'Ein Konflikt ist aufgetreten. Die Ressource existiert möglicherweise bereits.',
    },
    422: {
        code: 'VALIDATION_ERROR',
        message: 'Die eingegebenen Daten sind ungültig.',
    },
    429: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',
    },
    500: {
        code: 'SERVER_ERROR',
        message: 'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
    },
    502: {
        code: 'BAD_GATEWAY',
        message: 'Der Server ist vorübergehend nicht erreichbar.',
    },
    503: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Der Dienst ist vorübergehend nicht verfügbar.',
    },
    504: {
        code: 'GATEWAY_TIMEOUT',
        message: 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.',
    },
};

const NETWORK_ERROR: { code: string; message: string } = {
    code: 'NETWORK_ERROR',
    message: 'Keine Verbindung zum Server. Bitte überprüfen Sie Ihre Internetverbindung.',
};

const UNKNOWN_ERROR: { code: string; message: string } = {
    code: 'UNKNOWN_ERROR',
    message: 'Ein unbekannter Fehler ist aufgetreten.',
};

// ---------------------------------------------------------------------------
// Error Parsing Functions
// ---------------------------------------------------------------------------

/**
 * Extract error detail from FastAPI error response
 */
function extractFastAPIDetail(data: unknown): string | undefined {
    if (!data || typeof data !== 'object') return undefined;

    const errorData = data as FastAPIError;

    if (typeof errorData.detail === 'string') {
        return errorData.detail;
    }

    if (Array.isArray(errorData.detail)) {
        return errorData.detail.map(d => d.msg).join(', ');
    }

    return undefined;
}

/**
 * Parse an Axios error into a standardized AppError
 */
export function parseApiError(error: unknown): AppError {
    // Handle Axios errors
    if (isAxiosError(error)) {
        const status = error.response?.status ?? 0;
        const detail = extractFastAPIDetail(error.response?.data);

        // Network error (no response)
        if (!error.response) {
            return {
                status: 0,
                code: NETWORK_ERROR.code,
                message: NETWORK_ERROR.message,
                detail: error.message,
                isNetworkError: true,
                requiresAuth: false,
            };
        }

        // Known status code
        const errorInfo = ERROR_MESSAGES[status] ?? UNKNOWN_ERROR;

        return {
            status,
            code: errorInfo.code,
            message: detail || errorInfo.message,
            detail,
            isNetworkError: false,
            requiresAuth: status === 401,
        };
    }

    // Handle regular Error objects
    if (error instanceof Error) {
        return {
            status: 0,
            code: UNKNOWN_ERROR.code,
            message: error.message || UNKNOWN_ERROR.message,
            detail: error.message,
            isNetworkError: false,
            requiresAuth: false,
        };
    }

    // Unknown error type
    return {
        status: 0,
        code: UNKNOWN_ERROR.code,
        message: UNKNOWN_ERROR.message,
        isNetworkError: false,
        requiresAuth: false,
    };
}

// ---------------------------------------------------------------------------
// Type Guards
// ---------------------------------------------------------------------------

/**
 * Check if an error is an Axios error
 */
export function isAxiosError(error: unknown): error is AxiosError {
    return (
        error !== null &&
        typeof error === 'object' &&
        'isAxiosError' in error &&
        (error as AxiosError).isAxiosError === true
    );
}

/**
 * Check if an error requires authentication
 */
export function isAuthError(error: unknown): boolean {
    if (isAxiosError(error)) {
        return error.response?.status === 401;
    }
    return false;
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
    if (isAxiosError(error)) {
        return !error.response;
    }
    return false;
}

// ---------------------------------------------------------------------------
// Logging Utilities
// ---------------------------------------------------------------------------

/**
 * Log an API error with appropriate level
 */
export function logApiError(error: AppError, context?: string): void {
    if (!env.IS_DEVELOPMENT && !env.DEBUG_MODE) return;

    const prefix = context ? `[${context}]` : '[API Error]';

    if (error.isNetworkError) {
        console.warn(`${prefix} Network error:`, error.message);
    } else if (error.status >= 500) {
        console.error(`${prefix} Server error (${error.status}):`, error.message, error.detail);
    } else if (error.status >= 400) {
        console.warn(`${prefix} Client error (${error.status}):`, error.message, error.detail);
    } else {
        console.log(`${prefix} Error:`, error);
    }
}

// ---------------------------------------------------------------------------
// User-Facing Error Messages
// ---------------------------------------------------------------------------

/**
 * Get a user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
    const appError = parseApiError(error);
    return appError.message;
}

/**
 * Get error code for programmatic handling
 */
export function getErrorCode(error: unknown): string {
    const appError = parseApiError(error);
    return appError.code;
}
