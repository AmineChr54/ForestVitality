/**
 * useRegionSearch Hook
 * ====================
 * Custom hook for searching regions with debounce and caching.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { searchRegions, getRegionGeometry } from '../api/municipalityApi';
import type { RegionItem, RegionSearchResponse } from '../types/api';

interface UseRegionSearchReturn {
    /** Current search query */
    query: string;
    /** Update search query (debounced) */
    setQuery: (query: string) => void;
    /** Search results grouped by type */
    results: RegionSearchResponse | null;
    /** Currently selected region */
    selectedRegion: RegionItem | null;
    /** Select a region */
    selectRegion: (region: RegionItem | null) => void;
    /** Geometry of selected region */
    selectedGeometry: GeoJSON.Geometry | GeoJSON.GeometryCollection | null;
    /** Loading state */
    isLoading: boolean;
    /** Error message */
    error: string | null;
    /** Clear selection and search */
    clear: () => void;
}

const DEBOUNCE_MS = 300;

export const useRegionSearch = (): UseRegionSearchReturn => {
    const [query, setQueryInternal] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [results, setResults] = useState<RegionSearchResponse | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<RegionItem | null>(null);
    const [selectedGeometry, setSelectedGeometry] = useState<GeoJSON.Geometry | GeoJSON.GeometryCollection | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounce query changes
    const setQuery = useCallback((newQuery: string) => {
        setQueryInternal(newQuery);

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            setDebouncedQuery(newQuery);
        }, DEBOUNCE_MS);
    }, []);

    // Fetch results when debounced query changes
    useEffect(() => {
        const fetchResults = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const data = await searchRegions(debouncedQuery, 50);
                setResults(data);
            } catch (err) {
                console.error('Region search error:', err);
                setError('Fehler beim Laden der Regionen');
                // Set empty results instead of null so UI still works
                setResults({ bundeslaender: [], bezirke: [], kreise: [] });
            } finally {
                setIsLoading(false);
            }
        };

        fetchResults();
    }, [debouncedQuery]);

    // Fetch geometry when region is selected
    useEffect(() => {
        if (!selectedRegion) {
            setSelectedGeometry(null);
            return;
        }

        const fetchGeometry = async () => {
            // New: Handle custom regions that already have geometry
            if (selectedRegion.type === 'custom' && selectedRegion.geometry) {
                setSelectedGeometry(selectedRegion.geometry);
                return;
            }

            try {
                const data = await getRegionGeometry(selectedRegion);
                setSelectedGeometry(data.geometry);
            } catch (err) {
                console.error('Geometry fetch error:', err);
                setSelectedGeometry(null);
            }
        };

        fetchGeometry();
    }, [selectedRegion]);

    const selectRegion = useCallback((region: RegionItem | null) => {
        setSelectedRegion(region);
        if (region) {
            setQueryInternal(region.name);
        }
    }, []);

    const clear = useCallback(() => {
        setQueryInternal('');
        setDebouncedQuery('');
        setSelectedRegion(null);
        setSelectedGeometry(null);
        setResults(null);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    return {
        query,
        setQuery,
        results,
        selectedRegion,
        selectRegion,
        selectedGeometry,
        isLoading,
        error,
        clear,
    };
};
