import { EnrichedInsight, StructuredEvidence } from './types';

/**
 * Deterministic development fallback used when no LLM provider is configured
 * (no LLM_PROVIDER_API_KEY). It produces plain-language enrichment derived
 * directly from the deterministic evidence, so the UX is fully usable offline.
 *
 * This is NOT genuine AI enrichment — it is explicitly labelled as a fallback
 * and must never be presented as LLM output.
 */

const SAFE_SUGGESTIONS = [
  'Maintain consistent tracking of your vitals, labs, and lifestyle so patterns stay visible over time.',
  'Prioritize regular, moderate activity and adequate sleep as part of an overall healthy routine.',
  'Discuss any concerning trends with a qualified healthcare professional before changing your care plan.',
];

export function fallbackEnrichment(evidence: StructuredEvidence): EnrichedInsight[] {
  const topFindings = (evidence.findings || [])
    .slice(0, 5)
    .map((finding, i) => {
      const severe = finding.severity === 'critical' || finding.severity === 'warning';
      const enriched: EnrichedInsight = {
        id: `enriched-fallback-${i}`,
        title: finding.title,
        summary: finding.summary,
        findings: [finding.summary],
        suggestions: i === 0 ? [...SAFE_SUGGESTIONS] : [],
        doctorConsultReason: severe
          ? 'Consider discussing this pattern with a qualified healthcare professional.'
          : undefined,
        sourceInsightId: String(i),
        warnings: [],
      };
      return enriched;
    });

  return topFindings;
}