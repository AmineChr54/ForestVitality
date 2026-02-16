// Vitality and Analysis Types

// Band resolution in meters (Sentinel-2 supports 10m, 20m, 60m)
export type BandResolution = 10 | 20;

// Vegetation Index constants
export const VegetationIndex = {
    NDVI: 'NDVI',   // Normalized Difference Vegetation Index
    EVI: 'EVI',     // Enhanced Vegetation Index
    NDWI: 'NDWI',   // Normalized Difference Water Index
    NDMI: 'NDMI',   // Normalized Difference Moisture Index
} as const;

export type VegetationIndex = typeof VegetationIndex[keyof typeof VegetationIndex];

export interface IndexInfo {
    id: VegetationIndex;
    name: string;
    description: string;
    bands: string[];
    availableResolutions: BandResolution[];
    defaultResolution: BandResolution;
    minValue: number;
    maxValue: number;
    colorScale: string[];
}

export const INDEX_INFO: Record<VegetationIndex, IndexInfo> = {
    [VegetationIndex.NDVI]: {
        id: VegetationIndex.NDVI,
        name: 'NDVI',
        description: 'Misst die Vegetationsgrüne und -gesundheit',
        bands: ['B8A (NIR)', 'B04 (Red)'],
        availableResolutions: [10, 20],
        defaultResolution: 20,
        minValue: -1,
        maxValue: 1,
        colorScale: ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850'],
    },
    [VegetationIndex.EVI]: {
        id: VegetationIndex.EVI,
        name: 'EVI',
        description: 'Erweiterter Vegetationsindex mit Atmosphärenkorrektur',
        bands: ['B8A (NIR)', 'B04 (Red)', 'B02 (Blue)'],
        availableResolutions: [10, 20],
        defaultResolution: 20,
        minValue: -1,
        maxValue: 1,
        colorScale: ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850'],
    },
    [VegetationIndex.NDWI]: {
        id: VegetationIndex.NDWI,
        name: 'NDWI',
        description: 'Normalisierter Differenz-Wasserindex',
        bands: ['B8A (NIR)', 'B03 (Green)'],
        availableResolutions: [10, 20],
        defaultResolution: 20,
        minValue: -1,
        maxValue: 1,
        colorScale: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#2171b5'],
    },
    [VegetationIndex.NDMI]: {
        id: VegetationIndex.NDMI,
        name: 'NDMI',
        description: 'Misst den Wassergehalt der Vegetation',
        bands: ['B8A (NIR)', 'B11 (SWIR)'],
        availableResolutions: [20],
        defaultResolution: 20,
        minValue: -1,
        maxValue: 1,
        colorScale: ['#a50026', '#d73027', '#f46d43', '#74add1', '#4575b4', '#313695'],
    },
};

// Analysis types
export interface AnalysisRequest {
    regionId: string;
    indexType: VegetationIndex;
    startDate: string;
    endDate: string;
    cloudCoverMax?: number;
    /** Band resolution in meters (10 or 20) */
    resolution?: BandResolution;
    /** BBox for ingestion: [minLon, minLat, maxLon, maxLat] */
    bbox?: [number, number, number, number];
    /** Optional specific geometry for this request (for sub-region clipping) */
    geometry?: GeoJSON.Geometry;
}

export interface AnalysisStats {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
}

// Analysis Status constants
export const AnalysisStatus = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
} as const;

export type AnalysisStatus = typeof AnalysisStatus[keyof typeof AnalysisStatus];

export interface AnalysisResult {
    id: string;
    regionId: string;
    indexType: VegetationIndex;
    startDate: string;
    endDate: string;
    stats: AnalysisStats;
    imageUrl?: string;
    overlayUrl?: string;
    /** S3 path for TiTiler (legacy, single tile) */
    scenePath?: string;
    /** S3 paths for all tiles covering the region (multi-tile support) */
    scenePaths?: string[];
    createdAt: string;
    status: AnalysisStatus;
    /** Specific geometry (sub-region) used for this result */
    geometry?: GeoJSON.Geometry;
    errorMessage?: string;
}

export interface AnalysisJob {
    jobId: string;
    status: AnalysisStatus;
    progress: number;
    result?: AnalysisResult;
}

// Sentinel image metadata
export interface SentinelImage {
    id: string;
    date: string;
    cloudCover: number;
    coverage: number;
    provider: string;
    thumbnailUrl?: string;
    downloadUrl?: string;
}

export interface SentinelQueryParams {
    regionId?: string;
    startDate: string;
    endDate: string;
    cloudCoverMax?: number;
    limit?: number;
}

// User-defined region for analysis (API match)
export interface ApiRegion {
    id: string;
    name: string;
    geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
    created_at: string;
    user_id?: string;
}


