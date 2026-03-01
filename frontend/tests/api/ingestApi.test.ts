/**
 * Tests for api/ingestApi.ts — pure utility functions
 * ====================================================
 * Only the functions that run without network calls are tested here.
 *
 * Covers:
 *  - isValidBbox()       → coordinate array validation
 *  - isValidDateString() → YYYY-MM-DD format check
 */

import { describe, it, expect } from 'vitest';
import { isValidBbox, isValidDateString } from '../../src/api/ingestApi';

// ── isValidBbox ──────────────────────────────────────────────────────
describe('isValidBbox', () => {
  it('accepts a valid bbox', () => {
    expect(isValidBbox([8.0, 49.0, 9.0, 50.0])).toBe(true);
  });

  it('rejects array with wrong length', () => {
    expect(isValidBbox([8.0, 49.0])).toBe(false);
    expect(isValidBbox([8.0, 49.0, 9.0, 50.0, 1.0])).toBe(false);
  });

  it('rejects non-array values', () => {
    expect(isValidBbox('8,49,9,50')).toBe(false);
    expect(isValidBbox(null)).toBe(false);
    expect(isValidBbox(undefined)).toBe(false);
  });

  it('rejects non-numeric elements', () => {
    expect(isValidBbox(['a', 'b', 'c', 'd'])).toBe(false);
  });

  it('rejects out-of-range longitude (>180)', () => {
    expect(isValidBbox([-200, 49, 9, 50])).toBe(false);
  });

  it('rejects out-of-range latitude (>90)', () => {
    expect(isValidBbox([8, -100, 9, 50])).toBe(false);
  });

  it('rejects when minLon >= maxLon', () => {
    expect(isValidBbox([9, 49, 8, 50])).toBe(false);
  });

  it('rejects when minLat >= maxLat', () => {
    expect(isValidBbox([8, 50, 9, 49])).toBe(false);
  });

  it('rejects Infinity / NaN', () => {
    expect(isValidBbox([Infinity, 49, 9, 50])).toBe(false);
    expect(isValidBbox([8, NaN, 9, 50])).toBe(false);
  });
});

// ── isValidDateString ────────────────────────────────────────────────
describe('isValidDateString', () => {
  it('accepts YYYY-MM-DD format', () => {
    expect(isValidDateString('2024-01-15')).toBe(true);
  });

  it('rejects DD-MM-YYYY format', () => {
    expect(isValidDateString('15-01-2024')).toBe(false);
  });

  it('rejects impossible calendar date', () => {
    expect(isValidDateString('2024-13-40')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidDateString('')).toBe(false);
  });
});
