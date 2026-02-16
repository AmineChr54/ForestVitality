// security/application/SecurityService.ts
import { KeycloakService } from "../domain/service/KeycloakService";
import { AuthResult } from "../domain/model/AuthResult";
import { SecurityConfig } from "../SecurityConfig";
import type { User, AuthState } from "../../types/user";

export class SecurityService {
  private readonly keycloakService = new KeycloakService();

  private user: User | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshTimer: any = null;

  constructor() {
    const storedToken = localStorage.getItem(SecurityConfig.tokenKey);
    const storedRefreshToken = localStorage.getItem(SecurityConfig.refreshTokenKey);

    if (storedToken) {
      this.accessToken = storedToken;
      this.refreshToken = storedRefreshToken;
      this.user = this.mapUserFromToken(storedToken);
      this.scheduleRefresh();
    }
  }

  // === LOGIN ===
  login(): void {
    this.keycloakService.login();
  }

  // === CALLBACK HANDLING ===
  async handleCallback(code: string): Promise<AuthResult> {
    try {
      const { accessToken, refreshToken } = await this.keycloakService.exchangeCodeForToken(code);

      this.accessToken = accessToken;
      this.refreshToken = refreshToken || null;

      localStorage.setItem(SecurityConfig.tokenKey, accessToken);
      if (refreshToken) {
        localStorage.setItem(SecurityConfig.refreshTokenKey, refreshToken);
      }

      this.user = this.mapUserFromToken(accessToken);
      this.scheduleRefresh();

      return AuthResult.success(undefined, "Successfully authenticated");
    } catch (error) {
      console.error("Error exchanging code for token:", error);
      return AuthResult.fromError(error);
    }
  }

  // === LOGOUT ===
  logout(): AuthResult {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;

    if (this.refreshTimer) clearTimeout(this.refreshTimer);

    localStorage.removeItem(SecurityConfig.tokenKey);
    localStorage.removeItem(SecurityConfig.refreshTokenKey);

    this.keycloakService.logout();
    return AuthResult.success(undefined, "Logged out");
  }

  // === AUTH STATE ===
  getAuthState(): AuthState {
    return {
      user: this.user,
      isAuthenticated: Boolean(this.accessToken),
      isLoading: false,
      error: null,
    };
  }

  // === AUTO REFRESH ===
  private scheduleRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    // Refresh every 4 minutes (Keycloak default is usually 5 min)
    // Ideally parse token exp, but fixed interval is safer MVP
    this.refreshTimer = setTimeout(() => this.refreshSession(), 4 * 60 * 1000);
  }

  async refreshSession(): Promise<boolean> {
    if (!this.refreshToken) return false;
    try {
      const tokens = await this.keycloakService.refreshAccessToken(this.refreshToken);

      this.accessToken = tokens.accessToken;
      localStorage.setItem(SecurityConfig.tokenKey, this.accessToken);

      if (tokens.refreshToken) {
        this.refreshToken = tokens.refreshToken;
        localStorage.setItem(SecurityConfig.refreshTokenKey, this.refreshToken);
      }

      // Debug log
      console.log("[Security] Token refreshed automatically ✅");

      this.scheduleRefresh();
      return true;
    } catch (error) {
      console.error("[Security] Auto-refresh failed:", error);
      // Do not logout immediately to avoid disrupting if network glitch? 
      // But if token invalid, next request will fail anyway.
      // Let's retry once or logout? Logout is safer to avoid bad state.
      this.logout();
      return false;
    }
  }

  // === PRIVATE HELPERS ===
  private mapUserFromToken(token: string): User {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));

    // Extract all roles from Keycloak token
    const realmRoles = payload.realm_access?.roles || [];
    const clientRoles = payload.resource_access?.['forest-vitality']?.roles || [];
    const allRoles = [...realmRoles, ...clientRoles];

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.preferred_username ?? payload.email,
      roles: allRoles,
      createdAt: new Date().toISOString(),
      lastLoginAt: undefined,
    };
  }
}
