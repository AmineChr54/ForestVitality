/**
 * Health API
 * ==========
 * API calls for health check operations.
 * 
 * Usage:
 *   import { checkHealth, checkOpenSearchHealth } from '@/api/healthApi';
 *   
 *   const isHealthy = await checkHealth();
 *   const osHealth = await checkOpenSearchHealth();
 */

import { httpClient } from './httpClient';
import { API_ENDPOINTS } from '../constants/api';
import type { HealthResponse, OpenSearchHealthResponse } from '../types/api';

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/**
 * Check basic API health.
 * 
 * @returns Health status
 */
export async function checkHealth(): Promise<HealthResponse> {
    const response = await httpClient.get<HealthResponse>(API_ENDPOINTS.HEALTH.STATUS);
    return response.data;
}

/**
 * Check OpenSearch connection health.
 * 
 * @returns OpenSearch health info with cluster name
 */
export async function checkOpenSearchHealth(): Promise<OpenSearchHealthResponse> {
    const response = await httpClient.get<OpenSearchHealthResponse>(
        API_ENDPOINTS.HEALTH.OPENSEARCH
    );
    return response.data;
}

/**
 * Check if the API is reachable (returns boolean instead of throwing)
 * 
 * @returns true if API is healthy, false otherwise
 */
export async function isApiHealthy(): Promise<boolean> {
    try {
        const response = await checkHealth();
        return response.status === 'ok';
    } catch {
        return false;
    }
}

/**
 * Check if OpenSearch is reachable (returns boolean instead of throwing)
 * 
 * @returns true if OpenSearch is healthy, false otherwise
 */
export async function isOpenSearchHealthy(): Promise<boolean> {
    try {
        const response = await checkOpenSearchHealth();
        return !!response.cluster_name;
    } catch {
        return false;
    }
}

/**
 * Check full system health
 * 
 * @returns Object with health status for each component
 */
export async function checkFullHealth(): Promise<{
    api: boolean;
    openSearch: boolean;
    allHealthy: boolean;
}> {
    const [api, openSearch] = await Promise.all([
        isApiHealthy(),
        isOpenSearchHealthy(),
    ]);

    return {
        api,
        openSearch,
        allHealthy: api && openSearch,
    };
}
