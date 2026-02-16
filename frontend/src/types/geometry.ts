// Geometry Types for GeoJSON and regions

export interface GeoJSONPoint {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoJSONPolygon {
    type: 'Polygon';
    coordinates: [number, number][][]; // Array of linear rings
}

export interface GeoJSONMultiPolygon {
    type: 'MultiPolygon';
    coordinates: [number, number][][][];
}

export type GeoJSONGeometry = GeoJSONPoint | GeoJSONPolygon | GeoJSONMultiPolygon;

export interface GeoJSONFeature<G extends GeoJSONGeometry = GeoJSONGeometry, P = Record<string, unknown>> {
    type: 'Feature';
    geometry: G;
    properties: P;
    id?: string | number;
}

export interface GeoJSONFeatureCollection<G extends GeoJSONGeometry = GeoJSONGeometry, P = Record<string, unknown>> {
    type: 'FeatureCollection';
    features: GeoJSONFeature<G, P>[];
}

// Region types
export interface Region {
    id: string;
    name: string;
    description?: string;
    geometry: GeoJSONPolygon | GeoJSONMultiPolygon;
    areaHectares?: number;
    createdAt: string;
    updatedAt: string;
    userId: string;
}

export interface CreateRegionInput {
    name: string;
    description?: string;
    geometry: GeoJSONPolygon | GeoJSONMultiPolygon;
}

export interface UpdateRegionInput {
    name?: string;
    description?: string;
    geometry?: GeoJSONPolygon | GeoJSONMultiPolygon;
}

// Map bounds
export interface LatLngBounds {
    north: number;
    south: number;
    east: number;
    west: number;
}

export interface LatLng {
    lat: number;
    lng: number;
}
