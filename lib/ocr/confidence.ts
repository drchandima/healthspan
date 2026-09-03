/**
 * Confidence evaluation for LLM/OCR-extracted lab fields.
 *
 * A field at or above LOW_CONFIDENCE_THRESHOLD is considered high-confidence
 * (reviewed but not necessarily trusted); anything below is a low-confidence
 * candidate that must be clearly flagged and remain editable.
 */
export const LOW_CONFIDENCE_THRESHOLD = 85;

/**
 * Clamps a raw confidence value to a safe 0-100 integer. Unknown/blank input
 * is treated as low confidence so nothing is silently trusted.
 */
export function normalizeConfidence(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

export function isLowConfidence(confidence: number): boolean {
  return confidence < LOW_CONFIDENCE_THRESHOLD;
}
