/**
 * Ingest API
 * ==========
 * API calls for data ingestion operations.
 * 
 * Usage:
 *   import { ingestScenes } from '@/api/ingestApi';
 *   
 *   const result = await ingestScenes({
 *     bbox: [8.0, 49.0, 9.0, 50.0],
 *     from_date: '2024-01-01',
 *     to_date: '2024-01-31'
 *   });
 */

import { httpClient } from './httpClient';
import { API_ENDPOINTS } from '../constants/api';
import type { IngestParams, IngestResponse } from '../types/api';
import { fetchEventSource, type SSEParsedEvent } from '../utils/sseUtil';

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/**
 * Ingest satellite scenes for a given bounding box and date range.
 * 
 * This triggers the backend to:
 * 1. Fetch scenes from Copernicus
 * 2. Convert to internal format
 * 3. Validate data
 * 4. Store in OpenSearch
 * 
 * @param params - Ingestion parameters (bbox, date range)
 * @returns Ingestion result with status and scenes processed
 */
export async function ingestScenes(params: IngestParams): Promise<IngestResponse> {
    // Backend expects bbox as query parameter array
    const response = await httpClient.post<IngestResponse>(
        API_ENDPOINTS.INGEST.SCENES,
        null,
        {
            params: {
                bbox: params.bbox,
                from_date: params.from_date,
                to_date: params.to_date,
            },
        }
    );

    return response.data;
}

/**
 * Ingest scenes with progress callback (for UI updates)
 * 
 * @param params - Ingestion parameters
 * @param onProgress - Callback for progress updates
 */
export async function ingestScenesWithProgress(
    params: IngestParams,
    onProgress?: (status: string) => void
): Promise<IngestResponse> {
    onProgress?.('Initiating data ingestion...');

    try {
        onProgress?.('Fetching satellite scenes...');
        const result = await ingestScenes(params);

        onProgress?.(`Completed: ${result.scenes_processed ?? 0} scenes processed`);
        return result;
    } catch (error) {
        onProgress?.('Ingestion failed');
        throw error;
    }
}

/**
 * Trigger streaming ingestion with real-time updates via SSE.
 * 
 * @param params Ingestion parameters
 * @param callbacks Event callbacks
 * @returns AbortController to cancel the stream
 */
export function ingestScenesStream(
    params: IngestParams,
    callbacks: {
        onMessage: (event: SSEParsedEvent) => void;
        onError?: (error: any) => void;
        onClose?: () => void;
    }
): AbortController {
    const controller = new AbortController();
    const { bbox, from_date, to_date, resolution } = params;

    const queryParams = new URLSearchParams({
        from_date,
        to_date,
    });
    // Add bbox params manually (array to repeating query params)
    bbox.forEach(coord => queryParams.append('bbox', coord.toString()));

    // Add resolution if specified
    if (resolution) {
        queryParams.set('resolution', resolution.toString());
    }

    const endpoint = `${API_ENDPOINTS.INGEST.STREAM}?${queryParams.toString()}`;

    fetchEventSource(endpoint, {
        method: 'POST',
        onMessage: callbacks.onMessage,
        onError: callbacks.onError,
        onClose: callbacks.onClose,
        signal: controller.signal,
    });

    return controller;
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Validate bounding box coordinates
 */
export function isValidBbox(bbox: unknown): bbox is [number, number, number, number] {
    if (!Array.isArray(bbox) || bbox.length !== 4) return false;
    if (!bbox.every(v => typeof v === 'number' && isFinite(v))) return false;

    const [minLon, minLat, maxLon, maxLat] = bbox;

    // Check valid coordinate ranges
    if (minLon < -180 || maxLon > 180) return false;
    if (minLat < -90 || maxLat > 90) return false;
    if (minLon >= maxLon || minLat >= maxLat) return false;

    return true;
}

/**
 * Validate date string format (YYYY-MM-DD)
 */
export function isValidDateString(date: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) return false;

    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
}
