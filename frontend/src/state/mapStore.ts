/**
 * Map Store
 * =========
 * Zustand store for managing map state, including current bounds.
 * Used by ChatWidget to provide geo-context to the AI.
 * 
 * Usage:
 *   import { useMapStore, getMapBounds } from '@/state/mapStore';
 *   
 *   // In components
 *   const { bounds, setBounds } = useMapStore();
 *   
 *   // For non-reactive access
 *   const bounds = getMapBounds();
 */

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MapBounds {
    /** Bounding box [west, south, east, north] = [minLng, minLat, maxLng, maxLat] */
    bbox: [number, number, number, number];
    /** Center coordinates [lng, lat] */
    center: [number, number];
    /** Current zoom level */
    zoom: number;
}

interface MapState {
    /** Current map bounds */
    bounds: MapBounds | null;
    /** Selected region ID (for context) */
    selectedRegionId: string | null;
    /** Selected region name */
    selectedRegionName: string | null;
}

interface MapActions {
    /** Update map bounds when map moves */
    setBounds: (bounds: MapBounds) => void;
    /** Set the currently selected region */
    setSelectedRegion: (id: string | null, name?: string | null) => void;
    /** Clear map state */
    clearMapState: () => void;
}

type MapStore = MapState & MapActions;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useMapStore = create<MapStore>()((set) => ({
    // Initial state
    bounds: null,
    selectedRegionId: null,
    selectedRegionName: null,

    // Actions
    setBounds: (bounds: MapBounds) => {
        set({ bounds });
    },

    setSelectedRegion: (id: string | null, name: string | null = null) => {
        set({ selectedRegionId: id, selectedRegionName: name });
    },

    clearMapState: () => {
        set({
            bounds: null,
            selectedRegionId: null,
            selectedRegionName: null,
        });
    },
}));

// ---------------------------------------------------------------------------
// Utility Functions (for use outside React components)
// ---------------------------------------------------------------------------

/**
 * Get current map bounds (for API calls)
 */
export function getMapBounds(): MapBounds | null {
    return useMapStore.getState().bounds;
}

/**
 * Get current geo context for chat requests
 */
export function getGeoContext(): {
    bbox?: [number, number, number, number];
    center?: [number, number];
    zoom?: number;
    regionId?: string;
    regionName?: string;
} | null {
    const state = useMapStore.getState();
    if (!state.bounds) return null;

    return {
        bbox: state.bounds.bbox,
        center: state.bounds.center,
        zoom: state.bounds.zoom,
        regionId: state.selectedRegionId || undefined,
        regionName: state.selectedRegionName || undefined,
    };
}
