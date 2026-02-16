/**
 * API Endpoint Constants
 * ======================
 * Centralized definition of all API endpoints.
 * These match the backend FastAPI routes.
 * 
 * Usage:
 *   import { API_ENDPOINTS } from '@/constants/api';
 *   httpClient.get(API_ENDPOINTS.HEALTH.STATUS);
 */

// ---------------------------------------------------------------------------
// API Endpoints
// ---------------------------------------------------------------------------

export const API_ENDPOINTS = {
  /**
   * Health check endpoints
   */
  HEALTH: {
    /** Basic health check */
    STATUS: '/health',
    /** OpenSearch connection health */
    OPENSEARCH: '/os-health',
  },

  /**
   * Authentication endpoints (for future implementation)
   */
  AUTH: {
    /** User login */
    LOGIN: '/auth/login',
    /** User logout */
    LOGOUT: '/auth/logout',
    /** Token refresh */
    REFRESH: '/auth/refresh',
    /** User registration */
    REGISTER: '/auth/register',
  },

  /**
   * Data ingestion endpoints
   */
  INGEST: {
    /** Ingest satellite data for a region and time range */
    SCENES: '/ingest/',
    /** Streaming ingestion status (SSE) */
    STREAM: '/ingest/stream',
  },

  /**
   * Sentinel satellite data endpoints
   */
  SENTINEL: {
    /** Fetch Sentinel scenes */
    FETCH: '/sentinel/fetch',
  },

  /**
   * Municipality lookup endpoints
   */
  MUNICIPALITY: {
    /** Look up municipality by name */
    LOOKUP: '/municipality/lookup',
    /** Search regions hierarchically */
    REGIONS: '/municipality/regions',
    /** Get region geometry */
    GEOMETRY: '/municipality/regions/geometry',
  },


  /**
   * Logging endpoints
   */
  LOGS: {
    /** Save a log entry */
    SAVE: '/save-log',
    /** Get a log by ID - use with template literal: `${LOGS.GET}/${logId}` */
    GET: '/logs',
  },

  /**
   * Vitality index endpoints (for future implementation)
   */
  VITALITY: {
    /** List available indices */
    INDICES: '/vitality/indices',
    /** Run analysis */
    ANALYZE: '/vitality/analyze',
    /** Get analysis results */
    RESULTS: '/vitality/results',
  },

  /**
   * AI/ML endpoints (for future implementation)
   */
  AI: {
    /** Get AI insights */
    INSIGHTS: '/ai/insights',
    /** Chat with AI */
    CHAT: '/ai/chat',
  },

  /**
   * Region management endpoints (for future implementation)
   */
  REGIONS: {
    /** List all regions */
    LIST: '/regions',
    /** Create a region */
    CREATE: '/regions',
    /** Get region by ID - use with template literal */
    GET: '/regions',
    /** Delete region by ID - use with template literal */
    DELETE: '/regions',
  },
} as const;

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Build endpoint URL with path parameters
 * @example buildEndpoint(API_ENDPOINTS.LOGS.GET, logId) => '/logs/abc123'
 */
export function buildEndpoint(base: string, ...params: string[]): string {
  if (params.length === 0) return base;
  return `${base}/${params.join('/')}`;
}

/**
 * Build endpoint URL with query parameters
 * @example buildQueryEndpoint('/search', { q: 'test', page: 1 }) => '/search?q=test&page=1'
 */
export function buildQueryEndpoint(
  base: string,
  params: Record<string, string | number | boolean | undefined>
): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${base}?${queryString}` : base;
}
