/**
 * Authentication Store
 * ====================
 * Zustand store for managing authentication state.
 * 
 * Features:
 * - Token storage with localStorage persistence
 * - Reactive auth state across components
 * - Clean logout with token clearing
 * 
 * Usage:
 *   import { useAuthStore } from '@/state/authStore';
 *   
 *   // In components
 *   const { token, isAuthenticated, setToken, logout } = useAuthStore();
 *   
 *   // For httpClient (non-reactive)
 *   const token = useAuthStore.getState().token;
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthState {
    /** JWT access token */
    token: string | null;

    /** Refresh token (if using refresh token flow) */
    refreshToken: string | null;

    /** Whether user is authenticated */
    isAuthenticated: boolean;
}

interface AuthActions {
    /** Set the access token */
    setToken: (token: string) => void;

    /** Set both access and refresh tokens */
    setTokens: (accessToken: string, refreshToken: string) => void;

    /** Clear all auth state (logout) */
    logout: () => void;

    /** Check if token exists (for initialization) */
    checkAuth: () => boolean;
}

type AuthStore = AuthState & AuthActions;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'vitality_auth_store';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            // Initial state
            token: null,
            refreshToken: null,
            isAuthenticated: false,

            // Actions
            setToken: (token: string) => {
                set({
                    token,
                    isAuthenticated: true,
                });
            },

            setTokens: (accessToken: string, refreshToken: string) => {
                set({
                    token: accessToken,
                    refreshToken,
                    isAuthenticated: true,
                });
            },

            logout: () => {
                set({
                    token: null,
                    refreshToken: null,
                    isAuthenticated: false,
                });
            },

            checkAuth: () => {
                const state = get();
                return state.token !== null && state.token !== '';
            },
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
            // Only persist token-related fields
            partialize: (state) => ({
                token: state.token,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

// ---------------------------------------------------------------------------
// Utility Functions (for use outside React components)
// ---------------------------------------------------------------------------

/**
 * Get the current auth token (for use in httpClient interceptors)
 */
export function getAuthToken(): string | null {
    const token = useAuthStore.getState().token;
    if (token) return token;
    // Fallback for SecurityService (non-synced state)
    return localStorage.getItem('vf_access_token');
}

/**
 * Clear auth state (for use in httpClient 401 handler)
 */
export function clearAuth(): void {
    localStorage.removeItem('vf_access_token');
    useAuthStore.getState().logout();
}

/**
 * Check if user is currently authenticated
 */
export function isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
}
