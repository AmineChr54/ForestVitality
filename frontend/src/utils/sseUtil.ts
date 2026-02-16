/**
 * SSE Utility
 * ===========
 * Helper for consuming Server-Sent Events via fetch (supports POST).
 * Native EventSource only supports GET.
 */
import { env } from '../config';
import { getAuthToken, clearAuth } from '../state/authStore';

export interface SSEParsedEvent {
    type: string;
    timestamp?: number;
    [key: string]: any;
}

export interface SSEOptions {
    method?: 'GET' | 'POST';
    body?: any;
    onMessage: (event: SSEParsedEvent) => void;
    onError?: (error: any) => void;
    onClose?: () => void;
    signal?: AbortSignal;
}

/**
 * Fetch SSE stream and parse events
 */
export async function fetchEventSource(endpoint: string, options: SSEOptions) {
    const { method = 'GET', body, onMessage, onError, onClose, signal } = options;
    const token = getAuthToken();

    const headers: HeadersInit = {
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Ensure endpoint starts with slash if not absolute (simplified)
    const url = endpoint.startsWith('http') ? endpoint : `${env.API_BASE_URL}${endpoint}`;

    // Debug Auth
    if (!token) {
        console.warn('[SSE] No auth token found using getAuthToken(). User might need to login.');
    } else {
        console.debug('[SSE] Attaching bearer token for:', url);
    }

    try {
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal,
        });

        if (!response.ok) {
            // Handle Auth Errors
            if (response.status === 401 || response.status === 403) {
                console.warn('[SSE] Auth failed:', response.status);
                clearAuth();
                // In browser, redirect to login
                if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                    // Optional: Save current path to redirect back?
                    window.location.href = '/auth/login';
                }
                throw new Error(`Authentication failed (${response.status}). Redirecting to login...`);
            }

            // Try to parse error message
            const text = await response.text();
            throw new Error(`SSE Request Failed (${response.status}): ${text}`);
        }

        if (!response.body) {
            throw new Error('No response body received');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Split by double newline (SSE standard separator)
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';

            for (const part of parts) {
                if (!part.trim()) continue;

                const lines = part.split('\n');
                let dataStr = '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        dataStr = line.slice(6);
                    }
                }

                if (dataStr) {
                    try {
                        const data = JSON.parse(dataStr);
                        onMessage(data);
                    } catch (e) {
                        console.warn('Failed to parse SSE JSON', e);
                    }
                }
            }
        }

        onClose?.();
    } catch (err) {
        if (signal?.aborted) return;
        onError?.(err);
    }
}
