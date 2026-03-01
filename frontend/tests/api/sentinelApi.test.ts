/**
 * Tests for api/sentinelApi.ts — pure utility functions
 * =====================================================
 * Only the functions that run without network calls are tested here.
 *
 * Covers:
 *  - extractBboxFromPolygon()    → bbox from GeoJSON polygon
 *  - isValidSentinelDateRange()  → date-range validation
 *  - formatSentinelDate()        → Date → 'YYYY-MM-DD'
 */

import { describe, it, expect } from 'vitest';
import {
  extractBboxFromPolygon,
  isValidSentinelDateRange,
  formatSentinelDate,
} from '../../src/api/sentinelApi';

// ── extractBboxFromPolygon ───────────────────────────────────────────
describe('extractBboxFromPolygon', () => {
  it('returns [minLon, minLat, maxLon, maxLat] for a simple polygon', () => {
    const polygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [8.0, 49.0],
          [9.0, 49.0],
          [9.0, 50.0],
          [8.0, 50.0],
          [8.0, 49.0],
        ],
      ],
    };

    expect(extractBboxFromPolygon(polygon)).toEqual([8.0, 49.0, 9.0, 50.0]);
  });
});

// ── isValidSentinelDateRange ─────────────────────────────────────────
describe('isValidSentinelDateRange', () => {
  it('accepts a valid short range', () => {
    expect(isValidSentinelDateRange('2024-01-01', '2024-03-01')).toBe(true);
  });

  it('rejects from >= to', () => {
    expect(isValidSentinelDateRange('2024-06-01', '2024-01-01')).toBe(false);
  });

  it('rejects future end date', () => {
    // test date is well in the future
    expect(isValidSentinelDateRange('2024-01-01', '2099-01-01')).toBe(false);
  });

  it('rejects range > 1 year', () => {
    expect(isValidSentinelDateRange('2020-01-01', '2022-01-01')).toBe(false);
  });

  it('rejects invalid date strings', () => {
    expect(isValidSentinelDateRange('not-a-date', '2024-01-01')).toBe(false);
  });
});

// ── formatSentinelDate ───────────────────────────────────────────────
describe('formatSentinelDate', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    const d = new Date('2024-07-15T12:00:00Z');
    expect(formatSentinelDate(d)).toBe('2024-07-15');
  });
});
