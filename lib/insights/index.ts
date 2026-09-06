import { HealthSpanStore } from '@/lib/types';
import { buildDeterministicInsights, buildStructuredEvidence } from './deterministicEngine';
import { isInsightsLlmConfigured, enrichEvidenceWithLlm } from './llmProvider';
import { validateEnrichment } from './validation';
import { fallbackEnrichment } from './mockProvider';
import { EnrichedInsight, InsightsResult } from './types';

/**
 * The single entry point for the LLM-backed Health Insights feature.
 *
 * Pipeline:
 *   1. Deterministic engine computes score + rule-based findings (authoritative).
 *   2. A compact evidence snapshot is built from that deterministic output.
 *   3. When an LLM provider is configured, it explains the evidence; the output
 *      is validated and unsafe/malformed fields are dropped.
 *   4. Otherwise a deterministic, labelled fallback enrichment is returned.
 *
 * The deterministic score/findings are always present and never affected by the
 * LLM. `fallback` is true when no provider is configured or every enriched
 * field failed validation. Nothing produced here is ever persisted.
 */
export async function generateInsights(store: HealthSpanStore): Promise<InsightsResult> {
  const deterministic = buildDeterministicInsights(store);
  const evidence = buildStructuredEvidence(store);

  let enriched: EnrichedInsight[] = [];
  let fallback = false;

  if (isInsightsLlmConfigured()) {
    try {
      const raw = await enrichEvidenceWithLlm(evidence);
      const validated = validateEnrichment(raw, evidence);
      enriched = validated.enriched;
      if (enriched.length === 0) {
        // No valid enrichment survived validation — degrade gracefully.
        enriched = fallbackEnrichment(evidence);
        fallback = true;
      }
    } catch (err) {
      console.error('LLM insights enrichment failed; using fallback:', err);
      enriched = fallbackEnrichment(evidence);
      fallback = true;
    }
  } else {
    enriched = fallbackEnrichment(evidence);
    fallback = true;
  }

  return {
    generatedAt: new Date().toISOString(),
    deterministic,
    enriched,
    fallback,
  };
}