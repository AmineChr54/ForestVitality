// Geo Utilities
import type { GeoJSONGeometry, GeoJSONPolygon, GeoJSONMultiPolygon } from '../types/geometry';

/**
 * Calculate the bounding box for a given GeoJSON geometry
 * Supports Polygon and MultiPolygon
 * 
 * @param geometry GeoJSON geometry object
 * @returns [minLon, minLat, maxLon, maxLat] or null if invalid
 */
export function getGeoJSONBBox(geometry: GeoJSONGeometry): [number, number, number, number] | null {
    if (!geometry) return null;

    let points: [number, number][] = [];

    if (geometry.type === 'Polygon') {
        // Outer ring of the first polygon
        points = (geometry as GeoJSONPolygon).coordinates[0];
    } else if (geometry.type === 'MultiPolygon') {
        // Collect all outer rings
        (geometry as GeoJSONMultiPolygon).coordinates.forEach(polygon => {
            if (polygon.length > 0) {
                points.push(...polygon[0]);
            }
        });
    } else if (geometry.type === 'Point') {
        const [lon, lat] = geometry.coordinates;
        return [lon, lat, lon, lat];
    }

    if (points.length === 0) return null;

    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;

    points.forEach(([lon, lat]) => {
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
    });

    return [minLon, minLat, maxLon, maxLat];
}
