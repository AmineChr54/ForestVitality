// Geo Utilities
import type { GeoJSONGeometry, GeoJSONPolygon, GeoJSONMultiPolygon } from '../types/geometry';
import type { Geometry, Polygon, Position } from 'geojson';

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

export type BBox = [number, number, number, number];

/** A single polygon (or the whole selection as fallback) to analyse independently. */
export interface SubRegion {
    bbox: BBox;
    geometry?: Geometry;
}

function ringBBox(ring: Position[]): BBox {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of ring) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }
    return [minX, minY, maxX, maxY];
}

/**
 * Split a geometry into one sub-region per polygon so that disjoint areas
 * (e.g. a municipality made of several islands) are analysed separately
 * instead of as one huge bounding box.
 *
 * Polygons, MultiPolygons and (nested) GeometryCollections are flattened.
 * If nothing usable is found, the whole selection is returned with `fallbackBBox`.
 */
export function splitIntoSubRegions(
    geometry: Geometry | null | undefined,
    fallbackBBox: BBox
): SubRegion[] {
    if (!geometry) return [{ bbox: fallbackBBox }];

    const polygons: Polygon[] = [];
    const collect = (geo: Geometry) => {
        switch (geo.type) {
            case 'Polygon':
                polygons.push(geo);
                break;
            case 'MultiPolygon':
                geo.coordinates.forEach((coordinates) => polygons.push({ type: 'Polygon', coordinates }));
                break;
            case 'GeometryCollection':
                geo.geometries?.forEach(collect);
                break;
        }
    };
    collect(geometry);

    const subRegions = polygons
        .filter((p) => p.coordinates[0]?.length > 0)
        .map((p) => ({ bbox: ringBBox(p.coordinates[0]), geometry: p }));

    return subRegions.length > 0 ? subRegions : [{ bbox: fallbackBBox, geometry }];
}
