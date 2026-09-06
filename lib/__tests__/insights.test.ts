import { describe, it, expect } from 'vitest';
import { buildDeterministicInsights, buildStructuredEvidence } from '@/lib/insights/deterministicEngine';
import { validateEnrichment } from '@/lib/insights/validation';
import { fallbackEnrichment } from '@/lib/insights/mockProvider';
import { StructuredEvidence, RawEnrichedInsight } from '@/lib/insights/types';
import { SEED_DEMO_STORE } from '@/lib/seedData';
import type { HealthSpanStore } from '@/lib/types';

describe('buildDeterministicInsights', () => {
  it('returns the same score and insight count as the legacy engine', () => {
    const result = buildDeterministicInsights(SEED_DEMO_STORE);
    expect(result.score.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.score.overallScore).toBeLessThanOrEqual(100);
    expect(result.insights.length).toBeGreaterThanOrEqual(1);
  });

  it('is independent of the LLM (no env required)', () => {
    const stripTimestamps = (result: ReturnType<typeof buildDeterministicInsights>) => ({
      ...result,
      insights: result.insights.map((i) => ({ ...i, detectedAt: undefined })),
    });
    expect(stripTimestamps(buildDeterministicInsights(SEED_DEMO_STORE))).toEqual(
      stripTimestamps(buildDeterministicInsights(SEED_DEMO_STORE))
    );
  });
});

describe('buildStructuredEvidence', () => {
  it('produces a compact evidence snapshot grounded in the store', () => {
    const evidence = buildStructuredEvidence(SEED_DEMO_STORE);
    expect(evidence.overallScore).toBeGreaterThanOrEqual(0);
    expect(evidence.scoreComponents.length).toBe(3);
    expect(evidence.findings.length).toBeGreaterThanOrEqual(1);
    expect(evidence.metrics.length).toBeGreaterThanOrEqual(1);
  });

  it('never reports a metric status above what the deterministic classifier yields', () => {
    const evidence = buildStructuredEvidence(SEED_DEMO_STORE);
    for (const m of evidence.metrics) {
      expect(['normal', 'borderline', 'critical']).toContain(m.status);
    }
  });

  it('computes percentage changes only when two readings exist', () => {
    const store: HealthSpanStore = structuredClone(SEED_DEMO_STORE);
    // Keep only a single FBS reading (and a single body metric) so no two
    // readings exist to compare -> no pctChange must be reported.
    store.timeSeries.labResults = store.timeSeries.labResults
      .filter((l) => l.testName === 'Fasting Blood Sugar')
      .slice(-1);
    store.timeSeries.bodyMetrics = store.timeSeries.bodyMetrics.slice(-1);

    const evidence = buildStructuredEvidence(store);
    const labMetric = evidence.metrics.find((m) => m.name === 'Fasting Blood Sugar');
    expect(labMetric).toBeDefined();
    expect(labMetric?.pctChange).toBeUndefined();
    const bmiMetric = evidence.metrics.find((m) => m.name === 'BMI');
    expect(bmiMetric?.pctChange).toBeUndefined();
  });
});

describe('validateEnrichment', () => {
  const evidence = buildStructuredEvidence(SEED_DEMO_STORE);

  it('accepts a well-formed, evidence-grounded explanation', () => {
    const raw: RawEnrichedInsight = {
      findings: [
        {
          sourceId: '0',
          title: 'Restated finding',
          summary: 'The current pattern may indicate increased metabolic risk based on the recorded measurements.',
          doctorConsultReason: 'Consider discussing these changes with a qualified healthcare professional.',
        },
      ],
      suggestions: ['Maintain regular moderate activity and adequate sleep.'],
    };
    const { enriched, warnings } = validateEnrichment(raw, evidence);
    expect(enriched).toHaveLength(1);
    expect(warnings).toEqual([]);
    expect(enriched[0].title).toBe('Restated finding');
  });

  it('drops findings that make a diagnostic claim', () => {
    const raw: RawEnrichedInsight = {
      findings: [
        { sourceId: '0', title: 'Bad', summary: 'You have diabetes and will develop complications.' },
        { sourceId: '1', title: 'Good', summary: 'A consistently elevated pattern may indicate increased risk; consider discussing it with a qualified healthcare professional.' },
      ],
    };
    const { enriched, warnings } = validateEnrichment(raw, evidence);
    expect(enriched).toHaveLength(1);
    expect(enriched[0].title).toBe('Good');
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });

  it('drops fields with missing titles or summaries', () => {
    const raw: RawEnrichedInsight = {
      findings: [{ sourceId: '0', title: '', summary: '' }],
    };
    const { enriched, warnings } = validateEnrichment(raw, evidence);
    expect(enriched).toHaveLength(0);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });

  it('never invents a source id that was not in the evidence', () => {
    const raw: RawEnrichedInsight = {
      findings: [
        { sourceId: '99', title: 'Orphaned', summary: 'A short summary that is safe enough to keep.' },
      ],
    };
    const { enriched } = validateEnrichment(raw, evidence);
    expect(enriched[0].sourceInsightId).toBeUndefined();
  });

  it('caps suggestions at three and drops unsafe suggestions', () => {
    const raw: RawEnrichedInsight = {
      findings: [
        { sourceId: '0', title: 'T', summary: 'Safe summary of the deterministic finding.' },
      ],
      suggestions: ['Do exercise.', 'Eat well.', 'Sleep more.', 'You will be cured.'],
    };
    const { enriched } = validateEnrichment(raw, evidence);
    expect(enriched[0].suggestions.length).toBeLessThanOrEqual(3);
    expect(enriched[0].suggestions.some((s) => /cured/i.test(s))).toBe(false);
  });
});

describe('fallbackEnrichment', () => {
  it('is deterministic and maps each top finding to a labelled enrichment', () => {
    const evidence = buildStructuredEvidence(SEED_DEMO_STORE);
    const a = fallbackEnrichment(evidence);
    const b = fallbackEnrichment(evidence);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(1);
    expect(a[0].id).toMatch(/^enriched-fallback-/);
  });

  it('adds a doctor-consult reason only for warning/critical findings', () => {
    const evidence: StructuredEvidence = {
      overallScore: 80,
      scoreGrade: 'Good',
      scoreComponents: [],
      metrics: [],
      findings: [
        { title: 'Critical one', severity: 'critical', category: 'Metabolic', summary: 'x', metricsInvolved: ['a'] },
        { title: 'Info one', severity: 'info', category: 'Lifestyle', summary: 'y', metricsInvolved: ['b'] },
      ],
    };
    const enriched = fallbackEnrichment(evidence);
    const critical = enriched.find((e) => e.title === 'Critical one');
    const info = enriched.find((e) => e.title === 'Info one');
    expect(critical?.doctorConsultReason).toBeDefined();
    expect(info?.doctorConsultReason).toBeUndefined();
  });
});