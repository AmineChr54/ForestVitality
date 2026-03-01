/**
 * Vitest Setup File
 * =================
 * Runs before every test file.
 * Stubs import.meta.env so config/env.ts works in test context.
 */

// Provide default VITE_* env vars that the app expects at runtime
Object.assign(import.meta.env, {
  VITE_API_BASE_URL: 'http://localhost:8000',
  VITE_MAP_TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  VITE_SENTINEL_API_KEY: '',
  VITE_DEBUG_MODE: 'false',
  DEV: true,
  PROD: false,
  MODE: 'test',
});
