import { ClinicalInsight, HealthScoreBreakdown } from '@/lib/types';

/**
 * Shared types for the LLM-backed Health Insights layer.
 *
 * The design keeps a strict separation of concerns:
 *  - The deterministic engine is the ONLY source of status/abnormalities,
 *    trends, score and score components. It is authoritative and repeatable.
 *  - The LLM receives a compact, validated snapshot of that evidence and is
 *    only ever asked to paraphrase / summarise / suggest general lifestyle
 *    guidance. It never computes ranges, values, trends, or diagnoses.
 *  - Validation guards the LLM's output; anything that fails the schema or a
 *    safety rule is dropped per-field. If no field remains the result is
 *    labelled `fallback: true`.
 */

/** A single metric used to ground one enriched explanation. */
export interface InsightEvidenceMetric {
  name: string;
  value: number;
  unit: string;
  /** Machine-readable reference-range status (deterministic). */
  status: 'normal' | 'borderline' | 'critical';
  /** Human reference text captured at evaluation time (e.g. '70 - 99 mg/dL'). */
  reference: string;
  /** Deterministic percentage change between the two most recent readings, if enough data. */
  pctChange?: number;
}

/** The compact, schema-checked snapshot handed to the LLM. */
export interface StructuredEvidence {
  overallScore: number;
  scoreGrade: string;
  scoreComponents: Array<{
    category: string;
    score: number;
    weight: number;
    status: string;
  }>;
  metrics: InsightEvidenceMetric[];
  /** Deterministic, rule-based findings already derived from the time series. */
  findings: Array<{
    title: string;
    severity: 'info' | 'warning' | 'critical';
    category: string;
    summary: string;
    metricsInvolved: string[];
  }>;
}

/** One raw (un-validated) explanation for an individual deterministic finding. */
export interface RawEnrichedFinding {
  /** Index of the corresponding finding in the evidence bundle. */
  sourceId?: string | number;
  title?: string;
  summary?: string;
  doctorConsultReason?: string;
}

/**
 * Raw, un-trusted output from the LLM. This is a draft that has NOT passed
 * validation and must never be surfaced directly.
 */
export interface RawEnrichedInsight {
  title?: string;
  summary?: string;
  /** Explanations for the deterministic findings — must not add new numbers. */
  findings?: RawEnrichedFinding[];
  /** General lifestyle guidance, not medical advice. */
  suggestions?: string[];
  doctorConsultReason?: string;
}

/** The validated, safe enrichment that may be presented to the user. */
export interface EnrichedInsight {
  id: string;
  title: string;
  summary: string;
  findings: string[];
  suggestions: string[];
  doctorConsultReason?: string;
  /** Which deterministic insight or metric this explanation grounds on. */
  sourceInsightId?: string;
  /** Warnings emitted during validation (dropped/malformed fields). */
  warnings: string[];
}

/** The deterministic findings, kept separate from any LLM enrichment. */
export interface DeterministicInsights {
  score: HealthScoreBreakdown;
  insights: ClinicalInsight[];
}

/** The top-level result returned by the /api/insights route. */
export interface InsightsResult {
  generatedAt: string;
  deterministic: DeterministicInsights;
  /** Present and populated only when the LLM path succeeded validation. */
  enriched?: EnrichedInsight[];
  /** True when no provider is configured or every enriched field was dropped. */
  fallback: boolean;
}