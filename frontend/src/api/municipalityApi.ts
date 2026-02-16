/**
 * Municipality API
 * ================
 * API calls for municipality lookup operations.
 * 
 * Usage:
 *   import { lookupMunicipality } from '@/api/municipalityApi';
 *   
 *   const details = await lookupMunicipality('Berlin');
 */

import { httpClient } from './httpClient';
import { API_ENDPOINTS } from '../constants/api';
import type {
    MunicipalityDetails,
    MunicipalityLookupParams,
    RegionSearchResponse,
    RegionGeometryResponse,
    RegionItem
} from '../types/api';

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/**
 * Look up a municipality by name.
 * 
 * @param name - Municipality name to search for
 * @returns Municipality details including geometry
 * @throws Error if municipality not found (404)
 */
export async function lookupMunicipality(name: string): Promise<MunicipalityDetails> {
    const params: MunicipalityLookupParams = { name };

    const response = await httpClient.get<MunicipalityDetails>(
        API_ENDPOINTS.MUNICIPALITY.LOOKUP,
        { params }
    );

    return response.data;
}

/**
 * Look up a municipality and return null if not found (instead of throwing)
 * 
 * @param name - Municipality name to search for
 * @returns Municipality details or null if not found
 */
export async function lookupMunicipalitySafe(
    name: string
): Promise<MunicipalityDetails | null> {
    try {
        return await lookupMunicipality(name);
    } catch (error) {
        // Return null for 404 errors, rethrow others
        if (error && typeof error === 'object' && 'status' in error) {
            if ((error as { status: number }).status === 404) {
                return null;
            }
        }
        throw error;
    }
}

/**
 * Extract bounding box from municipality details
 * 
 * @param municipality - Municipality details
 * @returns Bounding box [minLon, minLat, maxLon, maxLat] or undefined
 */
export function getMunicipalityBbox(
    municipality: MunicipalityDetails
): [number, number, number, number] | undefined {
    return municipality.bbox;
}

/**
 * Get the center point of a municipality
 * 
 * @param municipality - Municipality details
 * @returns [lon, lat] center point or undefined
 */
export function getMunicipalityCenter(
    municipality: MunicipalityDetails
): [number, number] | undefined {
    if (!municipality.bbox) return undefined;

    const [minLon, minLat, maxLon, maxLat] = municipality.bbox;
    return [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
}

// ---------------------------------------------------------------------------
// Region Search Functions
// ---------------------------------------------------------------------------

/**
 * Search regions hierarchically across Bundesland, Bezirk, and Kreis levels.
 * 
 * @param query - Search query string (optional)
 * @param limit - Maximum results per category (default 20)
 * @returns Grouped search results
 */
export async function searchRegions(
    query?: string,
    limit: number = 20
): Promise<RegionSearchResponse> {
    const response = await httpClient.get<RegionSearchResponse>(
        API_ENDPOINTS.MUNICIPALITY.REGIONS,
        {
            params: {
                search: query || undefined,
                limit
            }
        }
    );

    return response.data;
}

/**
 * Get the geometry (polygon) for a specific region.
 * 
 * @param region - The region item to get geometry for
 * @returns GeoJSON geometry
 */
export async function getRegionGeometry(
    region: RegionItem
): Promise<RegionGeometryResponse> {
    const response = await httpClient.get<RegionGeometryResponse>(
        API_ENDPOINTS.MUNICIPALITY.GEOMETRY,
        {
            params: {
                region_type: region.type,
                name: region.name,
                bundesland: region.bundesland,
                bezirk: region.bezirk
            }
        }
    );

    return response.data;
}
