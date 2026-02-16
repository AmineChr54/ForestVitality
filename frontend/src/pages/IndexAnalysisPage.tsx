// Index Analysis Page Component
import { useState, useEffect } from 'react';
import { useRegionSearch, useAnalysis } from '../hooks';
import { useAuth } from '../hooks';
import { canAnalyze } from '../utils/roleUtils';
import { MapView } from '../components/map/MapView';
import { IndexLegend } from '../components/map/IndexLegend';
import { IndexSelector } from '../components/indexCalculator/IndexSelector';
import { ResolutionSelector } from '../components/indexCalculator/ResolutionSelector';
import { RunAnalysisButton } from '../components/indexCalculator/RunAnalysisButton';
import { RegionSearchbox } from '../components/regions/RegionSearchbox';
import { VegetationIndex, INDEX_INFO, AnalysisStatus } from '../types/vitality';
import type { BandResolution } from '../types/vitality';
import { getGeoJSONBBox } from '../utils/geoUtils';
import { useRegions } from '../hooks/useRegions'; // Import local regions hook
import { fetchVitalityStatistics } from '../api/vitalityApi';
import './IndexAnalysisPage.css';

const IndexAnalysisPage = () => {
    // Use new region search hook instead of old useRegions
    const {
        query,
        setQuery,
        results,
        selectedRegion,
        selectRegion,
        selectedGeometry,
        isLoading: isRegionLoading
    } = useRegionSearch();

    // Access local custom regions
    const { regions: customRegions } = useRegions();

    const { currentJob, isLoading, runAnalysis, getResultsByRegion, noScenesSuggestion, clearSuggestion } = useAnalysis();
    const { user } = useAuth();

    const [selectedIndex, setSelectedIndex] = useState<VegetationIndex>(VegetationIndex.NDVI);
    const [selectedResolution, setSelectedResolution] = useState<BandResolution>(20);
    const [overlayOpacity, setOverlayOpacity] = useState(0.9);
    // Single date instead of range (cleaner for single-scene analysis)
    const [analysisDate, setAnalysisDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 7); // Default: 1 week ago (more likely to have clear imagery)
        return date.toISOString().split('T')[0];
    });

    // Check for custom region in URL on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const customRegionId = params.get('customRegionId');

        if (customRegionId && customRegions.length > 0) {
            const region = customRegions.find(r => r.id === customRegionId);
            if (region) {
                // Calculate bbox if missing (it should be there usually, but ensure consistency)
                // Region type from useRegions is 'Region', we need to convert to 'RegionItem'

                // We use our utility to get the bbox from geometry if needed
                const bbox = getGeoJSONBBox(region.geometry);

                if (bbox) {
                    selectRegion({
                        name: region.name,
                        type: 'custom',
                        bbox: bbox,
                        geometry: region.geometry,
                        id: region.id
                    });
                    // Clear the param so it doesn't re-trigger or pollute URL
                    window.history.replaceState({}, '', window.location.pathname);
                }
            }
        }
    }, [customRegions, selectRegion]);

    // Auto-correct resolution when index changes (e.g., NDMI only supports 20m)
    useEffect(() => {
        const info = INDEX_INFO[selectedIndex];
        if (!info.availableResolutions.includes(selectedResolution)) {
            setSelectedResolution(info.defaultResolution);
        }
    }, [selectedIndex, selectedResolution]);

    // Check if user can run analysis
    const userCanAnalyze = canAnalyze(user);

    // Get region ID for analysis results (use region name as ID for now)
    const regionId = selectedRegion ? `${selectedRegion.type}-${selectedRegion.name}` : null;
    const regionResults = regionId ? getResultsByRegion(regionId) : [];

    // Track the configuration of the last manual run to enable auto-fetching
    const [lastRunConfig, setLastRunConfig] = useState<{
        regionId: string;
        date: string;
        resolution: BandResolution;
    } | null>(null);

    // Track the last auto-run attempt key to prevent infinite loops on failure
    const [autoRunKey, setAutoRunKey] = useState<string | null>(null);

    const isAnalyzing = currentJob?.status === AnalysisStatus.PROCESSING;



    // State for average index value
    const [averageIndexValue, setAverageIndexValue] = useState<number | null>(null);

    // Fetch statistics when analysis results change
    useEffect(() => {
        const fetchStats = async () => {
            // Find relevant result for current index
            const activeResult = regionResults.find(r => r.indexType === selectedIndex);

            if (activeResult && activeResult.scenePath) {
                // Use selectedGeometry if available (for precise clipping), otherwise selectedRegion.bbox (less precise)
                // TiTiler needs a Geometry. selectedRegion usually has bbox.

                let geometry = selectedGeometry;
                if (!geometry && selectedRegion && selectedRegion.bbox) {
                    // Convert bbox to polygon if no geometry
                    const [minX, minY, maxX, maxY] = selectedRegion.bbox;
                    geometry = {
                        type: 'Polygon',
                        coordinates: [[
                            [minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY], [minX, minY]
                        ]]
                    };
                }

                if (geometry) {
                    try {
                        const stats = await fetchVitalityStatistics(activeResult.scenePath!, geometry, selectedIndex);

                        if (stats) {
                            console.log('[AnalysisPage] Got stats:', stats);
                            setAverageIndexValue(stats.mean);
                        } else {
                            setAverageIndexValue(null);
                        }
                    } catch (err) {
                        console.error("Error fetching stats:", err);
                        setAverageIndexValue(null);
                    }
                }
            } else {
                setAverageIndexValue(null);
            }
        };

        // Debounce slightly to avoid rapid updates during switching
        const timer = setTimeout(fetchStats, 200);
        return () => clearTimeout(timer);
    }, [regionResults, selectedIndex, selectedGeometry, selectedRegion]);

    // Auto-fetch when index changes if the context matches the last run
    useEffect(() => {
        if (!lastRunConfig || !regionId) return;

        // check if we are still on the same "context" (region + date)
        // We ignore resolution changes because some indices force different resolutions (e.g. NDMI)
        // and we still want auto-fetch to work in those cases.
        const isSameContext =
            lastRunConfig.regionId === regionId &&
            lastRunConfig.date === analysisDate;

        if (isSameContext) {
            // Context matches, so index change is safe to auto-run

            // Check if current resolution is supported for the selected index
            // This prevents race condition where index changes (e.g. to NDMI) but resolution hasn't auto-corrected to 20m yet
            const info = INDEX_INFO[selectedIndex];
            if (!info.availableResolutions.includes(selectedResolution)) {
                return;
            }

            // We check if results already exist for this index to avoid redundant calls
            const hasResult = regionResults.some(r =>
                r.indexType === selectedIndex &&
                r.startDate === analysisDate &&
                r.createdAt // Basic check
            );

            // Generate key for current potential run (include resolution to be specific)
            const currentKey = `${regionId}-${analysisDate}-${selectedIndex}-${selectedResolution}`;

            if (!hasResult && !isAnalyzing && autoRunKey !== currentKey) {
                console.log('[AutoAnalysis] Triggering auto-fetch for new index:', selectedIndex);
                setAutoRunKey(currentKey);
                handleRunAnalysis();
            }
        }
    }, [selectedIndex, regionId, analysisDate, selectedResolution, lastRunConfig, regionResults, isAnalyzing, autoRunKey]);

    const handleRunAnalysis = async () => {
        if (!selectedRegion || !selectedRegion.bbox) return;

        // Reset average value on new run
        setAverageIndexValue(null);

        // Store this run configuration
        if (regionId) {
            setLastRunConfig({
                regionId,
                date: analysisDate,
                resolution: selectedResolution
            });
        }

        // Determine if we need to split the region (MultiPolygon)
        let subRegions: { bbox: [number, number, number, number], geometry: any }[] = [];

        // ... (rest of function logic) ...

        // Recursive helper to flatten geometry into sub-regions
        const processGeometry = (geo: any) => {
            if (geo.type === 'Polygon') {
                const coords = geo.coordinates;
                const ring = coords[0];
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                ring.forEach((p: any) => {
                    const [x, y] = p;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                });
                subRegions.push({
                    bbox: [minX, minY, maxX, maxY],
                    geometry: geo
                });
            } else if (geo.type === 'MultiPolygon') {
                geo.coordinates.forEach((coords: any) => {
                    processGeometry({ type: 'Polygon', coordinates: coords });
                });
            } else if (geo.type === 'GeometryCollection') {
                // Check if geometries exists and is array
                if (geo.geometries && Array.isArray(geo.geometries)) {
                    geo.geometries.forEach((g: any) => processGeometry(g));
                }
            }
        };

        if (selectedGeometry) {
            console.log('[Analysis] Processing geometry type:', selectedGeometry.type);
            processGeometry(selectedGeometry);

            // If flattening produced no regions (e.g. empty collection), fallback
            if (subRegions.length === 0) {
                subRegions = [{ bbox: selectedRegion.bbox, geometry: selectedGeometry }];
            }
        } else {
            subRegions = [{ bbox: selectedRegion.bbox, geometry: selectedGeometry }];
        }

        // Run analysis for each sub-region sequentially
        for (let i = 0; i < subRegions.length; i++) {
            const sub = subRegions[i];
            console.log(`[Analysis] Processing sub-region ${i + 1}/${subRegions.length}`);

            try {
                await runAnalysis({
                    regionId: regionId!,
                    indexType: selectedIndex,
                    resolution: selectedResolution,
                    startDate: analysisDate,
                    endDate: analysisDate,
                    bbox: sub.bbox,
                    geometry: sub.geometry,
                }, { append: i > 0 }); // Append subsequent results
            } catch (e) {
                console.warn(`[Analysis] Failed to load sub-region ${i + 1}`, e);
                // Continue with next region
            }
        }
    };

    const applySuggestion = () => {
        if (!noScenesSuggestion) return;
        setAnalysisDate(noScenesSuggestion.suggestedDate);
        clearSuggestion();

        // Optionally auto-run, but for now just let user click run again to be safe
        // Or we could trigger it next render via effect, but button click is explicit
    };

    return (
        <div className="analysis-page">
            {/* Left Sidebar - Controls */}
            <div className="analysis-sidebar">
                <h3 className="sidebar-title">🔬 Analyse-Parameter</h3>

                <div className="sidebar-controls">
                    {/* Region Selection - New Searchbox */}
                    <div className="control-group">
                        <label className="control-label">Region</label>
                        <RegionSearchbox
                            query={query}
                            onQueryChange={setQuery}
                            results={results}
                            selectedRegion={selectedRegion}
                            onSelect={selectRegion}
                            isLoading={isRegionLoading}
                            placeholder="Bundesland, Bezirk oder Kreis suchen..."
                        />
                    </div>

                    {/* Index Selection */}
                    {userCanAnalyze && (
                        <>
                            <div className="control-group">
                                <label className="control-label">Vegetationsindex</label>
                                <IndexSelector
                                    selectedIndex={selectedIndex}
                                    onSelect={setSelectedIndex}
                                />
                            </div>

                            {/* Resolution Selection */}
                            <div className="control-group">
                                <label className="control-label">Bandauflösung</label>
                                <ResolutionSelector
                                    selectedIndex={selectedIndex}
                                    selectedResolution={selectedResolution}
                                    onSelect={setSelectedResolution}
                                />
                            </div>

                            {/* Date Selection (Single Day) */}
                            <div className="control-group">
                                <label className="control-label">Analysedatum</label>
                                <input
                                    type="date"
                                    value={analysisDate}
                                    onChange={(e) => setAnalysisDate(e.target.value)}
                                    className="date-input"
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            {/* Suggestion Alert */}
                            {noScenesSuggestion && (
                                <div className="suggestion-alert">
                                    <div className="suggestion-header">
                                        <span>⚠️</span>
                                        <h4>Keine Daten gefunden</h4>
                                    </div>
                                    <p>Am <strong>{noScenesSuggestion.originalDate}</strong> sind keine Satellitenbilder verfügbar.</p>
                                    <p>Vorschlag: Nächste Aufnahme am <strong>{noScenesSuggestion.suggestedDate}</strong> verwenden.</p>
                                    <div className="suggestion-actions">
                                        <button
                                            className="btn btn-sm btn-outline"
                                            onClick={clearSuggestion}
                                        >
                                            Abbrechen
                                        </button>
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={applySuggestion}
                                        >
                                            Datum übernehmen
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Run Button */}
                            <RunAnalysisButton
                                onClick={handleRunAnalysis}
                                isLoading={isAnalyzing}
                                disabled={!selectedRegion || !selectedRegion.bbox || isLoading}
                                progress={currentJob?.progress}
                            />
                        </>
                    )}

                    {!userCanAnalyze && (
                        <div className="alert alert-info" style={{ marginTop: '1rem' }}>
                            <span>🔒</span>
                            <p>Sie haben keine Berechtigung, Analysen durchzuführen. Kontaktieren Sie einen Administrator.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Center - Map */}
            <div className="analysis-map-container">
                <MapView
                    selectedBbox={selectedRegion?.bbox}
                    selectedGeometry={selectedGeometry}
                    selectedRegionName={selectedRegion?.name}
                    analysisOverlay={null}
                    analysisOverlays={regionResults.filter(r => r.indexType === selectedIndex)}
                    overlayOpacity={overlayOpacity}
                />

                {regionResults.length > 0 && (
                    <IndexLegend
                        indexType={selectedIndex}
                        indexInfo={INDEX_INFO[selectedIndex]}
                        opacity={overlayOpacity}
                        onOpacityChange={setOverlayOpacity}
                        averageValue={averageIndexValue}
                    />
                )}
            </div>
        </div>
    );
};

export default IndexAnalysisPage;
