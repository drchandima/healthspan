import { EnrichedInsight, RawEnrichedInsight, StructuredEvidence } from './types';

/**
 * Validates and normalizes raw, un-trusted LLM insight output into safe
 * `EnrichedInsight[]` objects. Fields that fail validation or safety rules are
 * dropped with a warning so that malformed or fabricated content is never
 * surfaced as a trusted explanation.
 */

/** Phrases/claims that are never acceptable from a decision-support engine. */
const PROHIBITED_PATTERNS = [
  /you (have|will develop|will get|suffer from)\b/i,
  /\bdiagnos(e|ed|is)\b/i,
  /\bcure\b/i,
  /\b(guarante|definitely|certainly)\b/i,
];

function stripMedicalClaims(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (PROHIBITED_PATTERNS.some((re) => re.test(trimmed))) return undefined;
  return trimmed;
}

function cleanText(value: unknown, maxLen = 240): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, maxLen);
}

function sanitizeSuggestion(value: unknown): string | undefined {
  const text = cleanText(value, 320);
  if (!text) return undefined;
  // Suggestions must be general lifestyle guidance, not medical directives.
  if (PROHIBITED_PATTERNS.some((re) => re.test(text))) return undefined;
  return text;
}

function idFor(index: number): string {
  return `enriched-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

export function validateEnrichment(
  raw: RawEnrichedInsight,
  evidence: StructuredEvidence
): { enriched: EnrichedInsight[]; warnings: string[] } {
  const warnings: string[] = [];
  const enriched: EnrichedInsight[] = [];

  const validFindingIds = new Set(evidence.findings.map((_, i) => String(i)));

  const rawFindings = Array.isArray(raw.findings) ? raw.findings : [];
  rawFindings.forEach((finding, i) => {
    const title = cleanText(finding?.title, 160);
    const summary = stripMedicalClaims(
      (cleanText(finding?.summary, 480) || '').replace(/\n+/g, ' ').trim()
    );
    const doctorConsultReason = cleanText(finding?.doctorConsultReason, 240);

    if (!title || !summary) {
      warnings.push(`LLM finding #${i + 1} was missing a valid title or summary and was dropped.`);
      return;
    }

    const sourceId =
      finding?.sourceId != null && validFindingIds.has(String(finding.sourceId))
        ? String(finding.sourceId)
        : undefined;

    enriched.push({
      id: idFor(i),
      title,
      summary,
      findings: [summary],
      suggestions: [],
      doctorConsultReason: doctorConsultReason || undefined,
      sourceInsightId: sourceId,
      warnings: [],
    });
  });

  const suggestions = Array.isArray(raw.suggestions)
    ? raw.suggestions
        .map(sanitizeSuggestion)
        .filter((s): s is string => Boolean(s))
        .slice(0, 3)
    : [];

  if (enriched.length > 0 && suggestions.length > 0) {
    enriched[0].suggestions = suggestions;
  } else if (suggestions.length > 0) {
    warnings.push('LLM returned suggestions but no valid findings; insights omitted.');
  }

  if (enriched.length === 0 && rawFindings.length > 0) {
    warnings.push('All LLM findings were dropped during validation.');
  }

  return { enriched, warnings };
}