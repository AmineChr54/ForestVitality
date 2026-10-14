// useAuth.ts - Bridge Hook (UI adapter)
// Keeps existing UI working, delegates real logic to SecurityAPI

import { useState, useCallback } from "react";
import { SecurityAPI } from "../security/SecurityAPI";
import type { LoginCredentials, AuthState } from "../types/user";

interface UseAuthReturn {
  user: AuthState["user"];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /** Starts the Keycloak redirect flow; credentials are entered on the Keycloak page. */
  login: (credentials?: LoginCredentials) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [state, setState] = useState<AuthState>(() =>
    SecurityAPI.getAuthState()
  );

  const login = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // ✅ Keycloak redirect
      SecurityAPI.login();

      // Redirect happens, but keeping this line is fine
      setState(SecurityAPI.getAuthState());
    } catch (err) {
      setState({
        ...SecurityAPI.getAuthState(),
        isLoading: false,
        error: err instanceof Error ? err.message : "Login failed",
      });
    }
  }, []);

  const logout = useCallback(() => {
    SecurityAPI.logout();
    setState(SecurityAPI.getAuthState());
  }, []);

  const checkAuth = useCallback(() => {
    setState(SecurityAPI.getAuthState());
  }, []);

  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
    checkAuth,
  };
};
