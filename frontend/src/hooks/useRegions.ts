// Regions Hook - Mock Implementation with localStorage persistence
// TODO: F2 should replace with React Query implementation

import { useState, useCallback, useEffect } from 'react';
import type { Region, CreateRegionInput, GeoJSONPolygon } from '../types';

const STORAGE_KEY = 'vitalityforest_regions';

// Initial demo regions
// Initial regions (empty)
const INITIAL_REGIONS: Region[] = [];

// Load regions from localStorage
const loadRegions = (): Region[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error loading regions from localStorage:', e);
    }
    // Initialize with empty array if nothing stored
    return INITIAL_REGIONS;
};

// Save regions to localStorage
const saveRegions = (regions: Region[]): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(regions));
    } catch (e) {
        console.error('Error saving regions to localStorage:', e);
    }
};

// Calculate approximate area in hectares from polygon coordinates
const calculateArea = (geometry: GeoJSONPolygon): number => {
    const coords = geometry.coordinates[0];
    if (coords.length < 3) return 0;

    // Simple shoelace formula for approximate area
    let area = 0;
    for (let i = 0; i < coords.length - 1; i++) {
        area += coords[i][0] * coords[i + 1][1];
        area -= coords[i + 1][0] * coords[i][1];
    }
    area = Math.abs(area) / 2;

    // Convert from degrees² to hectares (very rough approximation)
    // 1 degree ≈ 111km at equator, so 1 degree² ≈ 12321 km² = 1,232,100 ha
    const hectares = area * 1232100;
    return Math.round(hectares);
};

interface UseRegionsReturn {
    regions: Region[];
    isLoading: boolean;
    error: string | null;
    selectedRegion: Region | null;
    selectRegion: (regionId: string | null) => void;
    createRegion: (input: CreateRegionInput) => Promise<Region>;
    deleteRegion: (regionId: string) => Promise<void>;
    refetch: () => void;
}

export const useRegions = (): UseRegionsReturn => {
    const [regions, setRegions] = useState<Region[]>(() => loadRegions());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

    // Persist regions whenever they change
    useEffect(() => {
        saveRegions(regions);
    }, [regions]);

    const selectedRegion = regions.find((r) => r.id === selectedRegionId) || null;

    const selectRegion = useCallback((regionId: string | null) => {
        setSelectedRegionId(regionId);
    }, []);

    const createRegion = useCallback(async (input: CreateRegionInput): Promise<Region> => {
        setIsLoading(true);
        setError(null);

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 300));

        const geometry = input.geometry as GeoJSONPolygon;
        const newRegion: Region = {
            id: `region-${Date.now()}`,
            name: input.name,
            description: input.description,
            geometry: geometry,
            areaHectares: calculateArea(geometry),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: 'user-123',
        };

        setRegions((prev) => {
            const updated = [...prev, newRegion];
            return updated;
        });
        setSelectedRegionId(newRegion.id);
        setIsLoading(false);

        return newRegion;
    }, []);

    const deleteRegion = useCallback(async (regionId: string): Promise<void> => {
        setIsLoading(true);
        setError(null);

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 200));

        setRegions((prev) => prev.filter((r) => r.id !== regionId));
        if (selectedRegionId === regionId) {
            setSelectedRegionId(null);
        }
        setIsLoading(false);
    }, [selectedRegionId]);

    const refetch = useCallback(() => {
        setIsLoading(true);
        const loaded = loadRegions();
        setRegions(loaded);
        setTimeout(() => {
            setIsLoading(false);
        }, 100);
    }, []);

    return {
        regions,
        isLoading,
        error,
        selectedRegion,
        selectRegion,
        createRegion,
        deleteRegion,
        refetch,
    };
};
