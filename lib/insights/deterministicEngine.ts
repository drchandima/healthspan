import { HealthSpanStore, ClinicalInsight, HealthScoreBreakdown } from '@/lib/types';
import { calculateHealthScore } from '@/lib/healthScoreCalculator';
import { generatePredictiveInsights } from '@/lib/riskPredictionEngine';
import { CLINICAL_REFERENCE_RANGES, classifyLabResult, calculateBMI, classifyBP } from '@/lib/referenceRanges';
import { DeterministicInsights, InsightEvidenceMetric, StructuredEvidence } from './types';

/**
 * The deterministic engine. This is the single authoritative source for:
 * reference-range status, abnormalities, percentage changes, trends, the
 * Health Score, and its component breakdown.
 *
 * It deliberately performs NO LLM calls and produces a compact, machine
 * readable `StructuredEvidence` bundle that later stages may enrich. Every
 * value here is derived from the time series by fixed rules, so it is
 * repeatable and auditable.
 */

/** Returns the two most recent readings for a test, ordered oldest -> newest. */
function pctChange(previous: number | undefined, current: number | undefined): number | undefined {
  if (previous === undefined || current === undefined || previous === 0) return undefined;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function buildDeterministicInsights(store: HealthSpanStore): DeterministicInsights {
  const score: HealthScoreBreakdown = calculateHealthScore(store);
  const insights: ClinicalInsight[] = generatePredictiveInsights(store);
  return { score, insights };
}

export function buildStructuredEvidence(store: HealthSpanStore): StructuredEvidence {
  const { score, insights } = buildDeterministicInsights(store);
  const { timeSeries, profile } = store;

  const metrics: InsightEvidenceMetric[] = [];

  // Latest body metric (weight/BMI + blood pressure) as evidence.
  const latestBody = timeSeries.bodyMetrics[timeSeries.bodyMetrics.length - 1];
  if (latestBody) {
    const previousBody = timeSeries.bodyMetrics[timeSeries.bodyMetrics.length - 2];
    const bmi =
      latestBody.bmi ||
      calculateBMI(
        latestBody.weightKg || profile.baselineBiometrics.initialWeightKg,
        latestBody.heightCm || profile.baselineBiometrics.initialHeightCm
      );
    if (bmi > 0) {
      metrics.push({
        name: 'BMI',
        value: bmi,
        unit: 'kg/m²',
        status: bmi >= 30 ? 'critical' : bmi >= 25 ? 'borderline' : 'normal',
        reference: '18.5 - 24.9 kg/m²',
        pctChange: pctChange(previousBody?.bmi, latestBody.bmi),
      });
    }
    if (latestBody.bloodPressure) {
      const bpClass = classifyBP(
        latestBody.bloodPressure.systolic,
        latestBody.bloodPressure.diastolic
      );
      metrics.push({
        name: 'Blood Pressure',
        value: latestBody.bloodPressure.systolic,
        unit: 'mmHg',
        status: bpClass.status === 'critical' ? 'critical' : bpClass.status === 'warning' ? 'borderline' : 'normal',
        reference: 'Systolic < 120 / Diastolic < 80 mmHg',
      });
    }
  }

  // Latest distinct lab results as evidence, classified deterministically.
  const latestLabMap = new Map<string, (typeof timeSeries.labResults)[number]>();
  for (const lab of timeSeries.labResults) latestLabMap.set(lab.testName.toLowerCase(), lab);

  latestLabMap.forEach((lab) => {
    const ref = CLINICAL_REFERENCE_RANGES[lab.testName];
    const classification = classifyLabResult(lab.testName, lab.value);
    const allForTest = timeSeries.labResults
      .filter((l) => l.testName.toLowerCase() === lab.testName.toLowerCase())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    metrics.push({
      name: lab.testName,
      value: lab.value,
      unit: lab.unit || ref?.unit || '',
      status: classification.status === 'critical' ? 'critical' : classification.status === 'borderline' ? 'borderline' : 'normal',
      reference: ref?.optimal || (ref ? `${ref.min} - ${ref.max} ${ref.unit}` : 'In range'),
      pctChange: pctChange(
        allForTest[allForTest.length - 2]?.value,
        allForTest[allForTest.length - 1]?.value
      ),
    });
  });

  const findings = insights.map((i) => ({
    title: i.title,
    severity: i.severity,
    category: i.category,
    summary: i.finding,
    metricsInvolved: i.metricsInvolved,
  }));

  return {
    overallScore: score.overallScore,
    scoreGrade: score.scoreGrade,
    scoreComponents: score.contributions.map((c) => ({
      category: c.category,
      score: c.score,
      weight: c.weight,
      status: c.status,
    })),
    metrics,
    findings,
  };
}