import { describe, it, expect } from 'vitest';
import {
  calculateBMI,
  classifyBMI,
  classifyBP,
  classifyLabResult,
  calculateCalorieTarget,
} from '@/lib/referenceRanges';

describe('calculateBMI', () => {
  it('computes BMI for a normal weight', () => {
    expect(calculateBMI(76, 178)).toBeCloseTo(24.0, 1);
  });

  it('computes BMI for an overweight case', () => {
    expect(calculateBMI(81.2, 178)).toBeCloseTo(25.6, 1);
  });

  it('returns 0 for missing or invalid inputs', () => {
    expect(calculateBMI(0, 178)).toBe(0);
    expect(calculateBMI(76, 0)).toBe(0);
    expect(calculateBMI(76, -1)).toBe(0);
  });
});

describe('classifyBMI', () => {
  it('classifies weight categories correctly', () => {
    expect(classifyBMI(17).status).toBe('warning');
    expect(classifyBMI(22).status).toBe('normal');
    expect(classifyBMI(27).status).toBe('warning');
    expect(classifyBMI(32).status).toBe('critical');
  });

  it('handles unknown/zero BMI', () => {
    const r = classifyBMI(0);
    expect(r.label).toBe('Unknown');
    expect(r.status).toBe('normal');
  });
});

describe('classifyBP', () => {
  it('classifies normal BP', () => {
    expect(classifyBP(118, 78).status).toBe('normal');
  });

  it('classifies elevated BP', () => {
    expect(classifyBP(125, 78).status).toBe('warning');
  });

  it('classifies stage 1 hypertension', () => {
    expect(classifyBP(132, 84).status).toBe('warning');
  });

  it('classifies stage 2 hypertension as critical', () => {
    expect(classifyBP(145, 95).status).toBe('critical');
  });
});

describe('classifyLabResult', () => {
  it('returns normal within range', () => {
    expect(classifyLabResult('Fasting Blood Sugar', 90).status).toBe('normal');
  });

  it('returns borderline for a moderate deviation', () => {
    expect(classifyLabResult('Fasting Blood Sugar', 114).status).toBe('borderline');
  });

  it('returns critical for a large deviation', () => {
    expect(classifyLabResult('Fasting Blood Sugar', 200).status).toBe('critical');
  });

  it('returns normal for an unknown test', () => {
    expect(classifyLabResult('Unknown Test', 999).status).toBe('normal');
  });
});

describe('calculateCalorieTarget', () => {
  it('computes BMR for a male using Mifflin-St Jeor', () => {
    const { bmr, tdee } = calculateCalorieTarget(80, 178, 42, 'male');
    expect(bmr).toBeGreaterThan(1500);
    expect(tdee).toBeGreaterThan(bmr);
  });

  it('computes a lower BMR for a female', () => {
    const male = calculateCalorieTarget(70, 165, 34, 'male');
    const female = calculateCalorieTarget(70, 165, 34, 'female');
    expect(female.bmr).toBeLessThan(male.bmr);
  });
});
