import { describe, it, expect } from 'vitest';
import { calculateHealthScore } from '@/lib/healthScoreCalculator';
import { SEED_DEMO_STORE } from '@/lib/seedData';
import type { HealthSpanStore } from '@/lib/types';

describe('calculateHealthScore', () => {
  it('produces a score between 0 and 100 with three weighted contributions', () => {
    const result = calculateHealthScore(SEED_DEMO_STORE);

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.contributions).toHaveLength(3);
    expect(result.trendHistory).toHaveLength(5);
    expect(result.scoreGrade).toBeDefined();
  });

  it('weights the contributions at 40/30/30', () => {
    const result = calculateHealthScore(SEED_DEMO_STORE);
    const lab = result.contributions.find((c) => c.category === 'Lab Biomarkers');
    const body = result.contributions.find((c) => c.category === 'Body Metrics');
    const life = result.contributions.find((c) => c.category === 'Lifestyle Habits');
    expect(lab?.weight).toBe(40);
    expect(body?.weight).toBe(30);
    expect(life?.weight).toBe(30);
  });

  it('lowers the score when labs are critical', () => {
    const bad: HealthSpanStore = structuredClone(SEED_DEMO_STORE);
    const latestFbs = bad.timeSeries.labResults.find(
      (l) => l.testName === 'Fasting Blood Sugar' && l.status === 'borderline'
    );
    expect(latestFbs).toBeDefined();
    if (latestFbs) latestFbs.status = 'critical';
    const result = calculateHealthScore(bad);
    expect(result.labBiomarkersScore).toBeLessThan(
      calculateHealthScore(SEED_DEMO_STORE).labBiomarkersScore
    );
  });

  it('lowers the body score when the latest BMI is obese', () => {
    const store: HealthSpanStore = structuredClone(SEED_DEMO_STORE);
    const latest = store.timeSeries.bodyMetrics[store.timeSeries.bodyMetrics.length - 1];
    latest.bmi = 34;
    latest.weightKg = 110;
    const result = calculateHealthScore(store);
    expect(result.bodyMetricsScore).toBeLessThan(
      calculateHealthScore(SEED_DEMO_STORE).bodyMetricsScore
    );
  });
});
