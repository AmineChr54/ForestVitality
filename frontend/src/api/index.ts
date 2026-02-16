/**
 * API Layer Barrel Export
 * =======================
 * Centralized exports for all API modules.
 * 
 * Usage:
 *   import { httpClient, ingestScenes, checkHealth } from '@/api';
 */

// HTTP Client
export { httpClient, get, post, put, patch, del } from './httpClient';
export type { AppError } from './httpClient';

// Health API
export {
    checkHealth,
    checkOpenSearchHealth,
    isApiHealthy,
    isOpenSearchHealthy,
    checkFullHealth,
} from './healthApi';

// Ingest API
export {
    ingestScenes,
    ingestScenesWithProgress,
    isValidBbox,
    isValidDateString,
} from './ingestApi';

// Sentinel API
export {
    fetchSentinelScenes,
    getSentinelSceneList,
    fetchScenesForPolygon,
    extractBboxFromPolygon,
    isValidSentinelDateRange,
    formatSentinelDate,
} from './sentinelApi';

// Municipality API
export {
    lookupMunicipality,
    lookupMunicipalitySafe,
    getMunicipalityBbox,
    getMunicipalityCenter,
} from './municipalityApi';
