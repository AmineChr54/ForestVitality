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
 */

import { describe, it, expect } from 'vitest';
import { getGeoJSONBBox } from '../../src/utils/geoUtils';
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
