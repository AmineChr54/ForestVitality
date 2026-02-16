/**
 * Sentinel API
 * ============
 * API calls for Sentinel satellite data operations.
 * 
 * Usage:
 *   import { fetchSentinelScenes } from '@/api/sentinelApi';
 *   
 *   const scenes = await fetchSentinelScenes({
 *     bbox: [8.0, 49.0, 9.0, 50.0],
 *     date_from: '2024-01-01',
 *     date_to: '2024-01-31'
 *   });
 */

import { httpClient } from './httpClient';
import { API_ENDPOINTS } from '../constants/api';
import type {
    SentinelFetchParams,
    SentinelFetchResponse,
    SentinelScene
} from '../types/api';

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/**
 * Fetch Sentinel satellite scenes for a given area and date range.
 * 
 * @param params - Search parameters (bbox, date range)
 * @returns Array of Sentinel scenes or error
 */
export async function fetchSentinelScenes(
    params: SentinelFetchParams
): Promise<SentinelFetchResponse> {
    const response = await httpClient.get<SentinelFetchResponse>(
        API_ENDPOINTS.SENTINEL.FETCH,
        {
            params: {
                bbox: params.bbox,
                date_from: params.date_from,
                date_to: params.date_to,
            },
        }
    );

    return response.data;
}

/**
 * Fetch Sentinel scenes and extract just the scene list.
 * Throws if there's an error in the response.
 * 
 * @param params - Search parameters
 * @returns Array of Sentinel scenes
 * @throws Error if response contains an error
 */
export async function getSentinelSceneList(
    params: SentinelFetchParams
): Promise<SentinelScene[]> {
    const response = await fetchSentinelScenes(params);

    if (response.error) {
        throw new Error(response.error);
    }

    return response.features ?? [];
}

/**
 * Fetch Sentinel scenes for a GeoJSON polygon.
 * Extracts bbox from the polygon geometry.
 * 
 * @param polygon - GeoJSON polygon geometry
 * @param dateFrom - Start date (YYYY-MM-DD)
 * @param dateTo - End date (YYYY-MM-DD)
 */
export async function fetchScenesForPolygon(
    polygon: GeoJSON.Polygon,
    dateFrom: string,
    dateTo: string
): Promise<SentinelScene[]> {
    const bbox = extractBboxFromPolygon(polygon);

    return getSentinelSceneList({
        bbox,
        date_from: dateFrom,
        date_to: dateTo,
    });
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Extract bounding box from a GeoJSON polygon
 */
export function extractBboxFromPolygon(polygon: GeoJSON.Polygon): number[] {
    const coordinates = polygon.coordinates[0]; // Outer ring

    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;

    for (const [lon, lat] of coordinates) {
        minLon = Math.min(minLon, lon);
        minLat = Math.min(minLat, lat);
        maxLon = Math.max(maxLon, lon);
        maxLat = Math.max(maxLat, lat);
    }

    return [minLon, minLat, maxLon, maxLat];
}

/**
 * Check if a date range is valid for Sentinel data
 * (not too old, not in the future, reasonable range)
 */
export function isValidSentinelDateRange(from: string, to: string): boolean {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const now = new Date();

    // Check valid dates
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return false;
    }

    // from should be before to
    if (fromDate >= toDate) {
        return false;
    }

    // to should not be in the future
    if (toDate > now) {
        return false;
    }

    // Range should not be too large (e.g., max 1 year)
    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in ms
    if (toDate.getTime() - fromDate.getTime() > maxRange) {
        return false;
    }

    return true;
}

/**
 * Format a date for Sentinel API (YYYY-MM-DD)
 */
export function formatSentinelDate(date: Date): string {
    return date.toISOString().split('T')[0];
}
