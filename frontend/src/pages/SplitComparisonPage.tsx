// Split Comparison Page Component - Compare same index across two dates for one region
import { useState, useEffect } from 'react';
import { useRegionSearch, useAnalysis } from '../hooks';
import { useAuth } from '../hooks';
import { canAnalyze } from '../utils/roleUtils';
import { MapView } from '../components/map/MapView';
import { IndexSelector } from '../components/indexCalculator/IndexSelector';
import { ResolutionSelector } from '../components/indexCalculator/ResolutionSelector';
import { RegionSearchbox } from '../components/regions/RegionSearchbox';
import { VegetationIndex, INDEX_INFO, AnalysisStatus } from '../types/vitality';
import type { BandResolution, AnalysisResult } from '../types/vitality';
import './SplitComparisonPage.css';

const SplitComparisonPage = () => {
    // Region search (shared for both sides)
    const {
        query,
        setQuery,
        results: searchResults,
        selectedRegion,
        selectRegion,
        selectedGeometry,
        isLoading: isRegionLoading,
    } = useRegionSearch();

    // Two separate analysis hook instances for left / right
    const leftAnalysis = useAnalysis();
    const rightAnalysis = useAnalysis();

    const {
        noScenesSuggestion: leftSuggestion,
        clearSuggestion: clearLeftSuggestion
    } = leftAnalysis;

    const {
        noScenesSuggestion: rightSuggestion,
        clearSuggestion: clearRightSuggestion
    } = rightAnalysis;
    const { user } = useAuth();

    // Shared controls
    const [selectedIndex, setSelectedIndex] = useState<VegetationIndex>(VegetationIndex.NDVI);
    const [selectedResolution, setSelectedResolution] = useState<BandResolution>(20);

    // Date inputs
    const [dateLeft, setDateLeft] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [dateRight, setDateRight] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });

    // Completed results (extracted from hooks on completion)
    const [leftResult, setLeftResult] = useState<AnalysisResult | null>(null);
    const [rightResult, setRightResult] = useState<AnalysisResult | null>(null);

    // Trigger for auto-zoom on run
    const [zoomTrigger, setZoomTrigger] = useState(0);

    // Auto-correct resolution when index changes
    useEffect(() => {
        const info = INDEX_INFO[selectedIndex];
        if (!info.availableResolutions.includes(selectedResolution)) {
            setSelectedResolution(info.defaultResolution);
        }
    }, [selectedIndex, selectedResolution]);

    // Watch for completed results from the analysis hooks
    useEffect(() => {
        if (leftAnalysis.results.length > 0) {
            setLeftResult(leftAnalysis.results[0]);
        }
    }, [leftAnalysis.results]);

    useEffect(() => {
        if (rightAnalysis.results.length > 0) {
            setRightResult(rightAnalysis.results[0]);
        }
    }, [rightAnalysis.results]);

    const userCanAnalyze = canAnalyze(user);
    const regionId = selectedRegion ? `${selectedRegion.type}-${selectedRegion.name}` : null;

    // Process geometry into sub-regions (same logic as IndexAnalysisPage)
    const getSubRegions = () => {
        if (!selectedRegion?.bbox) return [];

        let subRegions: { bbox: [number, number, number, number]; geometry: any }[] = [];

        const processGeometry = (geo: any) => {
            if (geo.type === 'Polygon') {
                const ring = geo.coordinates[0];
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                ring.forEach((p: any) => {
                    const [x, y] = p;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                });
                subRegions.push({ bbox: [minX, minY, maxX, maxY], geometry: geo });
            } else if (geo.type === 'MultiPolygon') {
                geo.coordinates.forEach((coords: any) => {
                    processGeometry({ type: 'Polygon', coordinates: coords });
                });
            } else if (geo.type === 'GeometryCollection') {
                if (geo.geometries && Array.isArray(geo.geometries)) {
                    geo.geometries.forEach((g: any) => processGeometry(g));
                }
            }
        };

        if (selectedGeometry) {
            processGeometry(selectedGeometry);
            if (subRegions.length === 0) {
                subRegions = [{ bbox: selectedRegion.bbox, geometry: selectedGeometry }];
            }
        } else {
            subRegions = [{ bbox: selectedRegion.bbox, geometry: selectedGeometry }];
        }

        return subRegions;
    };

    const handleRunComparison = async () => {
        if (!selectedRegion?.bbox || !regionId) return;

        // Trigger zoom to region
        setZoomTrigger(prev => prev + 1);

        // Clear previous results
        setLeftResult(null);
        setRightResult(null);

        const subRegions = getSubRegions();

        // Run left side
        const runSide = async (
            analysis: ReturnType<typeof useAnalysis>,
            date: string
        ) => {
            for (let i = 0; i < subRegions.length; i++) {
                const sub = subRegions[i];
                try {
                    await analysis.runAnalysis(
                        {
                            regionId: regionId!,
                            indexType: selectedIndex,
                            resolution: selectedResolution,
                            startDate: date,
                            endDate: date,
                            bbox: sub.bbox,
                            geometry: sub.geometry,
                        },
                        { append: i > 0 }
                    );
                } catch (e) {
                    console.warn(`[Compare] Failed sub-region ${i + 1} for date ${date}`, e);
                }
            }
        };

        // Run both sides in parallel
        await Promise.all([
            runSide(leftAnalysis, dateLeft),
            runSide(rightAnalysis, dateRight),
        ]);
    };

    const isRunning =
        leftAnalysis.currentJob?.status === AnalysisStatus.PROCESSING ||
        rightAnalysis.currentJob?.status === AnalysisStatus.PROCESSING;
    const isLeftLoading = leftAnalysis.isLoading;
    const isRightLoading = rightAnalysis.isLoading;

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };



    const applyLeftSuggestion = () => {
        if (leftSuggestion) {
            setDateLeft(leftSuggestion.suggestedDate);
            clearLeftSuggestion();
        }
    };

    const applyRightSuggestion = () => {
        if (rightSuggestion) {
            setDateRight(rightSuggestion.suggestedDate);
            clearRightSuggestion();
        }
    };

    // If user cannot analyze, show message
    if (!userCanAnalyze) {
        return (
            <div className="comparison-page">
                <div className="alert alert-info" style={{ margin: '2rem', maxWidth: '600px' }}>
                    <span>🔒</span>
                    <p>Sie haben keine Berechtigung, Vergleiche anzuzeigen. Kontaktieren Sie einen Administrator.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="comparison-page">
            {/* Left Sidebar - Controls */}
            <div className="comparison-sidebar">
                <h3 className="sidebar-title">📊 Zeitvergleich</h3>

                <div className="sidebar-controls">
                    {/* Region Selection */}
                    <div className="control-group">
                        <label className="control-label">Region</label>
                        <RegionSearchbox
                            query={query}
                            onQueryChange={setQuery}
                            results={searchResults}
                            selectedRegion={selectedRegion}
                            onSelect={selectRegion}
                            isLoading={isRegionLoading}
                            placeholder="Region suchen..."
                        />
                    </div>

                    {/* Index Selection */}
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

                    {/* Date Selection */}
                    <div className="control-group">
                        <label className="control-label">Datum A (Links)</label>
                        <input
                            type="date"
                            value={dateLeft}
                            onChange={(e) => setDateLeft(e.target.value)}
                            className="date-input"
                            max={new Date().toISOString().split('T')[0]}
                        />
                        {leftSuggestion && (
                            <div className="suggestion-alert">
                                <div className="suggestion-header">
                                    <span>⚠️</span>
                                    <h4>Keine Daten</h4>
                                </div>
                                <p>Am <strong>{leftSuggestion.originalDate}</strong> nichts gefunden.<br />Vorschlag: <strong>{leftSuggestion.suggestedDate}</strong></p>
                                <div className="suggestion-actions">
                                    <button className="btn btn-sm btn-outline" onClick={clearLeftSuggestion}>X</button>
                                    <button className="btn btn-sm btn-primary" onClick={applyLeftSuggestion}>Übernehmen</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="control-group">
                        <label className="control-label">Datum B (Rechts)</label>
                        <input
                            type="date"
                            value={dateRight}
                            onChange={(e) => setDateRight(e.target.value)}
                            className="date-input"
                            max={new Date().toISOString().split('T')[0]}
                        />
                        {rightSuggestion && (
                            <div className="suggestion-alert">
                                <div className="suggestion-header">
                                    <span>⚠️</span>
                                    <h4>Keine Daten</h4>
                                </div>
                                <p>Am <strong>{rightSuggestion.originalDate}</strong> nichts gefunden.<br />Vorschlag: <strong>{rightSuggestion.suggestedDate}</strong></p>
                                <div className="suggestion-actions">
                                    <button className="btn btn-sm btn-outline" onClick={clearRightSuggestion}>X</button>
                                    <button className="btn btn-sm btn-primary" onClick={applyRightSuggestion}>Übernehmen</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Run Comparison Button */}
                <div className="sidebar-action">
                    <button
                        className={`btn-run-comparison ${isRunning ? 'btn-run-comparison--loading' : ''}`}
                        onClick={handleRunComparison}
                        disabled={!selectedRegion || !selectedRegion.bbox || isRunning || dateLeft === dateRight}
                    >
                        {isRunning ? (
                            <>
                                <span className="run-spinner"></span>
                                <span>Analyse läuft...</span>
                            </>
                        ) : (
                            <>
                                <span className="run-icon">⚡</span>
                                <span>Vergleich starten</span>
                            </>
                        )}
                    </button>
                    {dateLeft === dateRight && (
                        <span className="comparison-hint">Wähle zwei verschiedene Daten</span>
                    )}
                    {(leftAnalysis.error || rightAnalysis.error) && (
                        <div className="comparison-error">
                            {leftAnalysis.error || rightAnalysis.error}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side - Comparison Panels */}
            <div className="comparison-main">
                <div className="comparison-container">
                    {/* Left Map */}
                    <div className="comparison-panel">
                        {leftResult ? (
                            <>
                                <div className="panel-header">
                                    <span className="badge badge-success">{leftResult.indexType}</span>
                                    <span className="panel-date">{formatDate(leftResult.startDate)}</span>
                                </div>
                                <div className="panel-map">
                                    <MapView
                                        selectedBbox={selectedRegion?.bbox}
                                        selectedGeometry={selectedGeometry}
                                        selectedRegionName={selectedRegion?.name}
                                        analysisOverlay={null}
                                        analysisOverlays={[leftResult]}
                                        overlayOpacity={0.9}
                                        zoomTrigger={zoomTrigger}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="empty-panel">
                                {isLeftLoading ? (
                                    <>
                                        <span className="empty-icon loading-pulse">⏳</span>
                                        <p>Analyse wird geladen...</p>
                                        {leftAnalysis.currentJob && (
                                            <div className="mini-progress">
                                                <div
                                                    className="mini-progress-bar"
                                                    style={{ width: `${leftAnalysis.currentJob.progress}%` }}
                                                />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <span className="empty-icon">📅</span>
                                        <p>Datum A – {formatDate(dateLeft)}</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="comparison-divider"></div>

                    {/* Right Map */}
                    <div className="comparison-panel">
                        {rightResult ? (
                            <>
                                <div className="panel-header">
                                    <span className="badge badge-success">{rightResult.indexType}</span>
                                    <span className="panel-date">{formatDate(rightResult.startDate)}</span>
                                </div>
                                <div className="panel-map">
                                    <MapView
                                        selectedBbox={selectedRegion?.bbox}
                                        selectedGeometry={selectedGeometry}
                                        selectedRegionName={selectedRegion?.name}
                                        analysisOverlay={null}
                                        analysisOverlays={[rightResult]}
                                        overlayOpacity={0.9}
                                        zoomTrigger={zoomTrigger}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="empty-panel">
                                {isRightLoading ? (
                                    <>
                                        <span className="empty-icon loading-pulse">⏳</span>
                                        <p>Analyse wird geladen...</p>
                                        {rightAnalysis.currentJob && (
                                            <div className="mini-progress">
                                                <div
                                                    className="mini-progress-bar"
                                                    style={{ width: `${rightAnalysis.currentJob.progress}%` }}
                                                />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <span className="empty-icon">📅</span>
                                        <p>Datum B – {formatDate(dateRight)}</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>


            </div>
        </div>
    );
};

export default SplitComparisonPage;
