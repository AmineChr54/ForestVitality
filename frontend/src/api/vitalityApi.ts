/**
 * Vitality API - Regions management and vegetation index analysis
  */
import { httpClient } from './httpClient';
import type { ApiRegion, AnalysisRequest, AnalysisResult } from '../types/vitality';

/**
 * Get all regions for the current user
 * Endpoint: GET /regions
 */
export const getRegions = async (): Promise<ApiRegion[]> => {
  const response = await httpClient.get<ApiRegion[]>('/regions');
  return response.data;
};

/**
 * Get a specific region by ID
 * Endpoint: GET /regions/{id}
 */
export const getRegionById = async (id: string): Promise<ApiRegion> => {
  const response = await httpClient.get<ApiRegion>(`/regions/${id}`);
  return response.data;
};

/**
 * Create a new region
 * Endpoint: POST /regions
 */
export const createRegion = async (region: Omit<ApiRegion, 'id' | 'created_at'>): Promise<ApiRegion> => {
  const response = await httpClient.post<ApiRegion>('/regions', region);
  return response.data;
};

/**
 * Update an existing region
 * Endpoint: PUT /regions/{id}
 */
export const updateRegion = async (id: string, region: Partial<ApiRegion>): Promise<ApiRegion> => {
  const response = await httpClient.put<ApiRegion>(`/regions/${id}`, region);
  return response.data;
};

/**
 * Delete a region
 * Endpoint: DELETE /regions/{id}
 */
export const deleteRegion = async (id: string): Promise<void> => {
  await httpClient.delete(`/regions/${id}`);
};

/**
 * Trigger vegetation index analysis for a region
 * Endpoint: POST /analysis
 */
export const runAnalysis = async (request: AnalysisRequest): Promise<AnalysisResult> => {
  const response = await httpClient.post<AnalysisResult>('/analysis', request);
  return response.data;
};

/**
 * Get analysis results for a region
 * Endpoint: GET /analysis?region_id={regionId}
 */
export const getAnalysisResults = async (regionId: string): Promise<AnalysisResult[]> => {
  const response = await httpClient.get<AnalysisResult[]>('/analysis', {
    params: { region_id: regionId },
  });
  return response.data;
};

/**
 * Get a specific analysis result by ID
 * Endpoint: GET /analysis/{id}
 */
export const getAnalysisById = async (id: string): Promise<AnalysisResult> => {
  const response = await httpClient.get<AnalysisResult>(`/analysis/${id}`);
  return response.data;
};

import axios from 'axios';
import { BAND_EXPRESSIONS } from '../constants/map';

/**
 * Fetch statistics for a specific region and index from TiTiler
 * Uses plain axios (no baseURL) so the request goes through the Vite dev proxy
 * (/titiler -> localhost:8082) instead of to the FastAPI backend.
 * Endpoint: POST /titiler/cog/statistics -> TiTiler /cog/statistics
 */
export const fetchVitalityStatistics = async (
  scenePath: string,
  geometry: any,
  indexType: string
): Promise<{ min: number; max: number; mean: number; median: number; std: number } | null> => {
  try {
    const expression = BAND_EXPRESSIONS[indexType];
    if (!expression) return null;

    // TiTiler expects a Feature or FeatureCollection. 
    // If we have a raw Geometry, wrap it in a Feature.
    const feature = geometry.type === 'Feature' || geometry.type === 'FeatureCollection'
      ? geometry
      : {
        type: 'Feature',
        properties: {},
        geometry: geometry
      };

    // Use plain axios (no baseURL) so the request hits the Vite dev server proxy,
    // which rewrites /titiler/* -> TiTiler at localhost:8082/*
    const response = await axios.post('/titiler/cog/statistics', feature, {
      params: {
        url: scenePath,
        expression: expression,
        max_size: 1024, // Limit size for performance
      },
    });

    // Response structure from TiTiler:
    // { "features": [ { "properties": { "statistics": { "b1": { "min": ..., "mean": ... } } } } ] }
    // Or if passed a single Feature, it might return just the properties/statistics directly?
    // Usually standard TiTiler /statistics with Feature input returns a FeatureCollection with 1 feature.

    // Check if valid response
    console.log('[VitalityStats] Response data:', response.data);

    if (response.data && response.data.features && response.data.features.length > 0) {
      const stats = response.data.features[0].properties.statistics;
      console.log('[VitalityStats] Features stats:', stats);

      const firstKey = Object.keys(stats)[0];
      if (firstKey && stats[firstKey]) {
        return stats[firstKey];
      }
    } else if (response.data && response.data.properties && response.data.properties.statistics) {
      // Fallback if it returns a single Feature
      const stats = response.data.properties.statistics;
      console.log('[VitalityStats] Properties stats:', stats);

      const firstKey = Object.keys(stats)[0];
      if (firstKey && stats[firstKey]) {
        return stats[firstKey];
      }
    }
    console.warn('[VitalityStats] No valid statistics found in response');
    return null;
  } catch (error) {
    console.error('Failed to fetch vitality stats:', error);
    return null;
  }
};
