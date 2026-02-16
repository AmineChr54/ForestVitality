/**
 * API Types
 * =========
 * TypeScript type definitions for API requests and responses.
 */

// ---------------------------------------------------------------------------
// Generic Response Types
// ---------------------------------------------------------------------------

/**
 * Standard API success response envelope
 */
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

/**
 * Standard API error format (matches FastAPI)
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Health Check Types
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: 'ok' | 'error';
}

export interface OpenSearchHealthResponse {
  cluster_name: string;
}

// ---------------------------------------------------------------------------
// Ingestion Types
// ---------------------------------------------------------------------------

export interface IngestParams {
  bbox: [number, number, number, number]; // [min_lon, min_lat, max_lon, max_lat]
  from_date: string; // YYYY-MM-DD
  to_date: string; // YYYY-MM-DD
  resolution?: number; // Band resolution in meters (10 or 20)
}

export interface IngestResponse {
  status: string;
  scenes_processed?: number;
  message?: string;
}

// ---------------------------------------------------------------------------
// Sentinel Types
// ---------------------------------------------------------------------------

export interface SentinelFetchParams {
  bbox: number[];
  date_from: string;
  date_to: string;
}

export interface SentinelScene {
  id: string;
  product_id?: string;
  datetime?: string;
  geometry?: GeoJSON.Geometry;
  properties?: Record<string, unknown>;
}

export interface SentinelFetchResponse {
  features?: SentinelScene[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Municipality Types
// ---------------------------------------------------------------------------

export interface MunicipalityLookupParams {
  name: string;
}

export interface MunicipalityDetails {
  name: string;
  gemeindeschluessel?: string;
  bundesland?: string;
  landkreis?: string;
  geometry?: GeoJSON.Geometry;
  bbox?: [number, number, number, number];
  [key: string]: unknown;
}

/**
 * Single region item from hierarchical search
 */
export interface RegionItem {
  name: string;
  type: 'bundesland' | 'bezirk' | 'kreis' | 'custom';
  bundesland?: string;
  bezirk?: string;
  kreis_type?: string;
  count?: number;
  bbox: [number, number, number, number] | null;
  geometry?: GeoJSON.Geometry | GeoJSON.GeometryCollection;
  id?: string;
}

/**
 * Response from /municipality/regions endpoint
 */
export interface RegionSearchResponse {
  bundeslaender: RegionItem[];
  bezirke: RegionItem[];
  kreise: RegionItem[];
}

/**
 * Response from /municipality/regions/geometry endpoint
 */
export interface RegionGeometryResponse {
  geometry: GeoJSON.Geometry | GeoJSON.GeometryCollection;
}


// ---------------------------------------------------------------------------
// Log Types
// ---------------------------------------------------------------------------

export interface LogEntry {
  id?: string;
  timestamp?: string;
  level?: 'info' | 'warning' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

export interface SaveLogResponse {
  result: 'saved';
  id: string;
}

// ---------------------------------------------------------------------------
// GeoJSON Types (for reference)
// ---------------------------------------------------------------------------

// Note: GeoJSON types are available from @types/geojson
// These are simplified versions for API responses

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export type GeoJSONGeometry = GeoJSONPoint | GeoJSONPolygon | GeoJSON.Geometry;
