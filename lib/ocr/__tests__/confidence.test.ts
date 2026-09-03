import { describe, it, expect } from 'vitest';
import {
  normalizeConfidence,
  isLowConfidence,
  LOW_CONFIDENCE_THRESHOLD,
} from '@/lib/ocr/confidence';

describe('normalizeConfidence', () => {
  it('clamps values into the 0-100 integer range', () => {
    expect(normalizeConfidence(96)).toBe(96);
    expect(normalizeConfidence(150)).toBe(100);
    expect(normalizeConfidence(-5)).toBe(0);
    expect(normalizeConfidence(78.6)).toBe(79);
  });

  it('parses string inputs', () => {
    expect(normalizeConfidence('94')).toBe(94);
    expect(normalizeConfidence('81')).toBe(81);
  });

  it('treats missing or non-numeric input as low confidence (0)', () => {
    expect(normalizeConfidence(undefined)).toBe(0);
    expect(normalizeConfidence(null)).toBe(0);
    expect(normalizeConfidence('')).toBe(0);
    expect(normalizeConfidence('abc')).toBe(0);
  });
});

describe('isLowConfidence', () => {
  it('flags values below the threshold', () => {
    expect(isLowConfidence(LOW_CONFIDENCE_THRESHOLD - 1)).toBe(true);
    expect(isLowConfidence(0)).toBe(true);
    expect(isLowConfidence(84.9)).toBe(true);
  });

  it('treats values at or above the threshold as acceptable', () => {
    expect(isLowConfidence(LOW_CONFIDENCE_THRESHOLD)).toBe(false);
    expect(isLowConfidence(85)).toBe(false);
    expect(isLowConfidence(100)).toBe(false);
  });
});
