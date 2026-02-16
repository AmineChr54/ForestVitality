// security/SecurityConfig.ts

interface SecurityRoutes {
  entryPath: string;
  loginPath: string;
  logoutPath: string;
  callbackPath: string;
}

interface KeycloakConfig {
  baseUrl: string;
  realm: string;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
}

export interface SecurityConfig {
  routes: SecurityRoutes;
  keycloak: KeycloakConfig;
  tokenKey: string;
  refreshTokenKey: string;
}

export const SecurityConfig: SecurityConfig = (() => {
  const appBaseUrl = import.meta.env.VITE_APP_BASE_URL;

  return {
    tokenKey: "vf_access_token",
    refreshTokenKey: "vf_refresh_token",

    routes: {
      entryPath: "/",
      loginPath: "/login",
      logoutPath: "/logout",
      callbackPath: "/security/callback",
    },

    keycloak: {
      baseUrl: import.meta.env.VITE_KEYCLOAK_URL,
      realm: import.meta.env.VITE_KEYCLOAK_REALM,
      clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
      redirectUri: `${appBaseUrl}/security/callback`,
      postLogoutRedirectUri: `${appBaseUrl}/login`,
    },
  };
})();
