// Analysis Hook - Real Implementation via SSE
import { useState, useCallback, useRef } from 'react';
import type { AnalysisRequest, AnalysisResult, AnalysisJob } from '../types/vitality';
import { AnalysisStatus } from '../types/vitality';
import { ingestScenesStream } from '../api/ingestApi';
import type { SSEParsedEvent } from '../utils/sseUtil';

interface UseAnalysisReturn {
    results: AnalysisResult[];
    currentJob: AnalysisJob | null;
    isLoading: boolean;
    error: string | null;
    noScenesSuggestion: {
        suggestedDate: string;
        originalDate: string;
        message: string;
    } | null;
    clearSuggestion: () => void;
    runAnalysis: (request: AnalysisRequest, options?: { append?: boolean }) => Promise<void>;
    getResultsByRegion: (regionId: string) => AnalysisResult[];
    getResultById: (analysisId: string) => AnalysisResult | undefined;
    cancelAnalysis: () => void;
}

export const useAnalysis = (): UseAnalysisReturn => {
    const [results, setResults] = useState<AnalysisResult[]>([]);
    const [currentJob, setCurrentJob] = useState<AnalysisJob | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [noScenesSuggestion, setNoScenesSuggestion] = useState<{
        suggestedDate: string;
        originalDate: string;
        message: string;
    } | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);
    const scenesRef = useRef<Array<{ scene_id?: string; scene_path?: string }>>([]); // scene_complete payloads collected during ingestion

    const cancelAnalysis = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
        setCurrentJob(prev => prev ? { ...prev, status: AnalysisStatus.FAILED } : null);
    }, []);

    const clearSuggestion = useCallback(() => {
        setNoScenesSuggestion(null);
    }, []);

    const runAnalysis = useCallback(async (request: AnalysisRequest, options: { append?: boolean } = {}): Promise<void> => {
        // Only cancel if NOT appending (start fresh)
        if (!options.append) {
            cancelAnalysis();
            scenesRef.current = []; // Clear scenes only for new job
            setNoScenesSuggestion(null); // Clear previous suggestions
        } else {
            scenesRef.current = []; // Clear scenes for THIS sub-job
        }

        setIsLoading(true);
        setError(null);

        const jobId = `job-${Date.now()}`;

        // Initial Job State
        const job: AnalysisJob = {
            jobId,
            status: AnalysisStatus.PENDING,
            progress: 0,
        };
        setCurrentJob(job);

        // Convert request to ingest params
        // Use the bbox passed in the request (from selectedRegion)
        if (!request.bbox) {
            setError('Keine BBox verfügbar - bitte Region auswählen');
            setIsLoading(false);
            return;
        }

        const bbox = request.bbox;

        try {
            const controller = ingestScenesStream(
                {
                    bbox: bbox,
                    from_date: request.startDate,
                    to_date: request.endDate,
                    resolution: request.resolution,
                },
                {
                    onMessage: (event: SSEParsedEvent) => {
                        const { type, ...payload } = event;

                        let progress = 0;
                        let status: AnalysisStatus = AnalysisStatus.PROCESSING;

                        // Identify event types (mapped from backend)
                        if (type === 'start') {
                            progress = 1;
                        } else if (type === 'download_progress') {
                            // payload: { scene_bytes, total_bytes, total_expected }
                            const { total_bytes = 0, total_expected = 0 } = payload;

                            // Calculate percentage based on total expected bytes
                            if (total_expected > 0) {
                                progress = Math.min(99, Math.round((total_bytes / total_expected) * 100));
                            } else {
                                // Fallback if total unknown (slow increment)
                                progress = Math.min(90, (currentJob?.progress || 0) + 0.5);
                            }
                        } else if (type === 'scene_complete') {
                            // payload: { scene_id, scene_path, ... }
                            scenesRef.current.push({
                                scene_id: payload.scene_id,
                                scene_path: payload.scene_path,
                            });
                            progress = Math.min(95, (currentJob?.progress || 0) + 5);
                        } else if (type === 'complete') {
                            progress = 100;
                            status = AnalysisStatus.COMPLETED;

                            // Collect ALL unique scene paths from ingested scenes
                            const allScenePaths = scenesRef.current
                                .map(s => s.scene_path)
                                .filter((path): path is string => !!path);

                            // Deduplicate paths (in case same tile appears multiple times)
                            const uniquePaths = [...new Set(allScenePaths)];

                            const finalResult: AnalysisResult = {
                                id: `analysis-${Date.now()}`,
                                regionId: request.regionId,
                                indexType: request.indexType,
                                startDate: request.startDate,
                                endDate: request.endDate,
                                stats: {
                                    min: 0, max: 1, mean: 0.5, median: 0.5, stdDev: 0.1
                                    // Placeholder stats
                                },
                                scenePath: uniquePaths[0], // First path for backward compat
                                scenePaths: uniquePaths,    // All paths for multi-tile
                                createdAt: new Date().toISOString(),
                                status: AnalysisStatus.COMPLETED,
                                geometry: request.geometry, // Pass through geometry
                            };

                            setResults(prev => [finalResult, ...prev]);
                            setCurrentJob(prev => prev ? { ...prev, status, progress: 100, result: finalResult } : null);
                            setIsLoading(false);
                            abortControllerRef.current = null;
                            return; // Done
                        } else if (type === 'no_scenes_error') {
                            // Backend found no scenes but suggested a date
                            setNoScenesSuggestion({
                                suggestedDate: payload.suggested_date ?? '',
                                originalDate: payload.original_date ?? '',
                                message: payload.message || 'Keine Aufnahmen gefunden'
                            });

                            // Stop loading but don't mark as failed job (so we can show the UI hint)
                            setIsLoading(false);
                            setCurrentJob(prev => prev ? { ...prev, status: AnalysisStatus.FAILED } : null);
                            abortControllerRef.current = null;
                            return;

                        } else if (type === 'error') {
                            setError(typeof payload === 'string' ? payload : JSON.stringify(payload));
                            status = AnalysisStatus.FAILED;
                            setCurrentJob(prev => prev ? { ...prev, status } : null);
                            setIsLoading(false);
                            return;
                        }

                        // Update Job State
                        setCurrentJob(prev => {
                            if (!prev) return null;
                            return {
                                ...prev,
                                status,
                                progress: Math.max(prev.progress, progress)
                            };
                        });
                    },
                    onError: (err) => {
                        console.error('SSE Error:', err);
                        setError(err instanceof Error && err.message ? err.message : 'Stream connection failed');
                        setCurrentJob(prev => prev ? { ...prev, status: AnalysisStatus.FAILED } : null);
                        setIsLoading(false);
                    },
                    onClose: () => {
                        // If closed without 'complete' event
                        if (isLoading) {
                            // Consider it finished or failed?
                            // Usually 'complete' event handles the finish.
                            // If we get here it might be network close.
                        }
                    }
                }
            );

            abortControllerRef.current = controller;

        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to start analysis');
            setIsLoading(false);
        }
    }, [cancelAnalysis, currentJob, isLoading]); // Careful with dependencies

    const getResultsByRegion = useCallback(
        (regionId: string): AnalysisResult[] => {
            return results.filter((r) => r.regionId === regionId);
        },
        [results]
    );

    const getResultById = useCallback(
        (analysisId: string): AnalysisResult | undefined => {
            return results.find((r) => r.id === analysisId);
        },
        [results]
    );

    return {
        results,
        currentJob,
        isLoading,
        error,
        noScenesSuggestion, // Export this
        clearSuggestion,    // Export this
        runAnalysis,
        getResultsByRegion,
        getResultById,
        cancelAnalysis
    };
};
