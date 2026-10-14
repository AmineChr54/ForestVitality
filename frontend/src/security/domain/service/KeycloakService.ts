import { SecurityConfig } from "../../SecurityConfig";

/** Subset of the Keycloak OpenID Connect token endpoint response we rely on. */
interface KeycloakTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

export class KeycloakService {
  // === LOGIN REDIRECT ===
  login(): void {
    const { baseUrl, realm, clientId, redirectUri } = SecurityConfig.keycloak;

    const authUrl =
      `${baseUrl}/realms/${realm}/protocol/openid-connect/auth` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=openid%20profile%20email`;

    window.location.href = authUrl;
  }

  // === TOKEN EXCHANGE ===
  async exchangeCodeForToken(code: string): Promise<{ accessToken: string; refreshToken?: string }> {
    const { baseUrl, realm, clientId, redirectUri } = SecurityConfig.keycloak;

    const tokenUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/token`;

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    // ✅ Always read response text first (so we can log it)
    const responseText = await response.text();

    // Try parse JSON (Keycloak usually returns JSON)
    let data: KeycloakTokenResponse | null = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = null;
    }

    // ❌ Error handling
    if (!response.ok) {
      console.error("[Keycloak] Token exchange failed", {
        status: response.status,
        statusText: response.statusText,
        responseBody: data ?? responseText,
      });

      const desc =
        (data && (data.error_description || data.error)) || responseText;

      throw new Error(
        `Token exchange failed (${response.status} ${response.statusText}): ${desc}`
      );
    }

    // ✅ Success path: validate token
    const accessToken = data?.access_token;
    if (!accessToken) {
      console.error(
        "[Keycloak] Token exchange succeeded but access_token missing:",
        data ?? responseText
      );
      throw new Error("No access_token returned from Keycloak.");
    }

    return {
      accessToken,
      refreshToken: data?.refresh_token
    };
  }

  // === TOKEN REFRESH ===
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> {
    const { baseUrl, realm, clientId } = SecurityConfig.keycloak;
    const tokenUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/token`;

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token // Keycloak may rotate refresh tokens
    };
  }

  // === LOGOUT REDIRECT ===
  logout(): void {
    const { baseUrl, realm, clientId, postLogoutRedirectUri } =
      SecurityConfig.keycloak;

    const logoutUrl =
      `${baseUrl}/realms/${realm}/protocol/openid-connect/logout` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;

    window.location.href = logoutUrl;
  }
}
