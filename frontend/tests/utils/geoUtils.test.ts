/**
 * Tests for utils/geoUtils.ts
 * ============================
 * Verifies bounding-box calculation from GeoJSON geometries.
 *
 * Covers:
 *  - Polygon            → correct [minLon, minLat, maxLon, maxLat]
 *  - MultiPolygon       → union of all outer rings
 *  - Point              → degenerate bbox [lon, lat, lon, lat]
 *  - null / undefined   → null
 *  - empty coordinates  → null
 *
 * Also covers splitIntoSubRegions (MultiPolygon / GeometryCollection flattening).
 */

import { describe, it, expect } from 'vitest';
import { getGeoJSONBBox, splitIntoSubRegions } from '../../src/utils/geoUtils';
import type { GeometryCollection, MultiPolygon, Point, Polygon } from 'geojson';
import type { GeoJSONPolygon, GeoJSONMultiPolygon, GeoJSONGeometry } from '../../src/types/geometry';

describe('getGeoJSONBBox', () => {
  it('calculates bbox for a Polygon', () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [
        [
          [8.0, 49.0],
          [9.0, 49.0],
          [9.0, 50.0],
          [8.0, 50.0],
          [8.0, 49.0], // closed ring
        ],
      ],
    };

    expect(getGeoJSONBBox(polygon)).toEqual([8.0, 49.0, 9.0, 50.0]);
  });

  it('calculates bbox for a MultiPolygon (union of rings)', () => {
    const multi: GeoJSONMultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        // polygon A
        [[[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]],
        // polygon B – extends the bbox
        [[[3, 0], [5, 0], [5, 4], [3, 4], [3, 0]]],
      ],
    };

    expect(getGeoJSONBBox(multi)).toEqual([1, 0, 5, 4]);
  });

  it('returns degenerate bbox for a Point', () => {
    const point: GeoJSONGeometry = { type: 'Point', coordinates: [8.65, 49.87] };

    expect(getGeoJSONBBox(point)).toEqual([8.65, 49.87, 8.65, 49.87]);
  });

  it('returns null for null / undefined geometry', () => {
    expect(getGeoJSONBBox(null as unknown as GeoJSONGeometry)).toBeNull();
    expect(getGeoJSONBBox(undefined as unknown as GeoJSONGeometry)).toBeNull();
  });

  it('returns null for empty Polygon coordinates', () => {
    const empty: GeoJSONPolygon = { type: 'Polygon', coordinates: [[]] };
    expect(getGeoJSONBBox(empty)).toBeNull();
  });
});

describe('splitIntoSubRegions', () => {
  const fallback: [number, number, number, number] = [0, 0, 10, 10];

  it('returns the fallback bbox when there is no geometry', () => {
    expect(splitIntoSubRegions(null, fallback)).toEqual([{ bbox: fallback }]);
  });

  it('returns one sub-region for a Polygon with its own bbox', () => {
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [[[1, 2], [3, 2], [3, 5], [1, 5], [1, 2]]],
    };
    expect(splitIntoSubRegions(polygon, fallback)).toEqual([{ bbox: [1, 2, 3, 5], geometry: polygon }]);
  });

  it('splits a MultiPolygon into one sub-region per polygon', () => {
    const multi: MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [1, 0], [1, 1], [0, 0]]],
        [[[5, 5], [8, 5], [8, 9], [5, 5]]],
      ],
    };
    const result = splitIntoSubRegions(multi, fallback);
    expect(result.map((r) => r.bbox)).toEqual([[0, 0, 1, 1], [5, 5, 8, 9]]);
    expect(result.every((r) => r.geometry?.type === 'Polygon')).toBe(true);
  });

  it('flattens nested GeometryCollections', () => {
    const collection: GeometryCollection = {
      type: 'GeometryCollection',
      geometries: [
        { type: 'Point', coordinates: [4, 4] },
        { type: 'GeometryCollection', geometries: [{ type: 'Polygon', coordinates: [[[2, 2], [3, 2], [3, 3], [2, 2]]] }] },
      ],
    };
    expect(splitIntoSubRegions(collection, fallback).map((r) => r.bbox)).toEqual([[2, 2, 3, 3]]);
  });

  it('falls back to the whole geometry when it contains no polygons', () => {
    const point: Point = { type: 'Point', coordinates: [4, 4] };
    expect(splitIntoSubRegions(point, fallback)).toEqual([{ bbox: fallback, geometry: point }]);
  });
});
