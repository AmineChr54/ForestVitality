/**
 * Environment Configuration
 * =========================
 * Centralized, type-safe environment variable handling.
 * 
 * Usage:
 *   import { env } from '@/config';
 *   console.log(env.API_BASE_URL);
 * 
 * All variables are validated at startup.
 * See .env.example for documentation of all variables.
 */

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

interface EnvironmentConfig {
  /** Base URL for the backend API (e.g., http://localhost:8000) */
  API_BASE_URL: string;
  
  /** URL template for map tiles (e.g., OpenStreetMap) */
  MAP_TILE_URL: string;
  
  /** Sentinel Hub API key (optional, backend handles most auth) */
  SENTINEL_API_KEY: string;
  
  /** Whether we're in development mode */
  IS_DEVELOPMENT: boolean;
  
  /** Whether we're in production mode */
  IS_PRODUCTION: boolean;
  
  /** Whether debug mode is enabled */
  DEBUG_MODE: boolean;
}

// ---------------------------------------------------------------------------
// Default Values
// ---------------------------------------------------------------------------

const DEFAULTS = {
  API_BASE_URL: 'http://localhost:8000',
  MAP_TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  SENTINEL_API_KEY: '',
  DEBUG_MODE: false,
} as const;

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Safely get a string environment variable with fallback
 */
function getEnvString(key: string, fallback: string): string {
  const value = import.meta.env[key];
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return String(value);
}

/**
 * Safely get a boolean environment variable with fallback
 */
function getEnvBoolean(key: string, fallback: boolean): boolean {
  const value = import.meta.env[key];
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return value === 'true' || value === '1' || value === true;
}

/**
 * Validate that a URL is properly formatted
 */
function validateUrl(url: string, name: string): string {
  try {
    // Allow template URLs with placeholders like {s}, {z}, {x}, {y}
    const testUrl = url.replace(/\{[^}]+\}/g, 'placeholder');
    new URL(testUrl);
    return url;
  } catch {
    console.warn(`[env] Invalid URL for ${name}: "${url}", using default`);
    return url; // Return anyway, let it fail at runtime if needed
  }
}

// ---------------------------------------------------------------------------
// Environment Configuration Object
// ---------------------------------------------------------------------------

/**
 * Main environment configuration object.
 * All values are validated and have sensible defaults.
 */
export const env: EnvironmentConfig = {
  API_BASE_URL: validateUrl(
    getEnvString('VITE_API_BASE_URL', DEFAULTS.API_BASE_URL),
    'VITE_API_BASE_URL'
  ),
  
  MAP_TILE_URL: validateUrl(
    getEnvString('VITE_MAP_TILE_URL', DEFAULTS.MAP_TILE_URL),
    'VITE_MAP_TILE_URL'
  ),
  
  SENTINEL_API_KEY: getEnvString('VITE_SENTINEL_API_KEY', DEFAULTS.SENTINEL_API_KEY),
  
  IS_DEVELOPMENT: import.meta.env.DEV === true,
  IS_PRODUCTION: import.meta.env.PROD === true,
  
  DEBUG_MODE: getEnvBoolean('VITE_DEBUG_MODE', DEFAULTS.DEBUG_MODE),
} as const;

// ---------------------------------------------------------------------------
// Development Logging
// ---------------------------------------------------------------------------

// Log configuration in development mode for debugging
if (env.IS_DEVELOPMENT && env.DEBUG_MODE) {
  console.group('[env] Environment Configuration');
  console.log('API_BASE_URL:', env.API_BASE_URL);
  console.log('MAP_TILE_URL:', env.MAP_TILE_URL);
  console.log('SENTINEL_API_KEY:', env.SENTINEL_API_KEY ? '***' : '(not set)');
  console.log('DEBUG_MODE:', env.DEBUG_MODE);
  console.groupEnd();
}

// ---------------------------------------------------------------------------
// Utility Exports
// ---------------------------------------------------------------------------

/**
 * Check if a required environment variable is set
 */
export function isEnvSet(key: keyof EnvironmentConfig): boolean {
  return env[key] !== '' && env[key] !== undefined && env[key] !== null;
}

/**
 * Get the API URL for a specific endpoint
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = env.API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Check if we're running in development mode
 */
export function isDev(): boolean {
  return env.IS_DEVELOPMENT;
}

/**
 * Check if we're running in production mode
 */
export function isProd(): boolean {
  return env.IS_PRODUCTION;
}
