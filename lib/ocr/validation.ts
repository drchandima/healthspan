import {
  RawLabReportExtraction,
  LabReportExtraction,
  ExtractedOcrField,
  LabPanelType,
} from '@/lib/types';
import { CLINICAL_REFERENCE_RANGES, classifyLabResult } from '@/lib/referenceRanges';
import { normalizeConfidence, isLowConfidence } from './confidence';

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Validates and normalizes raw, un-trusted LLM extraction into a structured,
 * confidence-scored LabReportExtraction that is safe to present for review.
 *
 * Fields that fail validation are excluded with a warning so that invalid or
 * invented output is never surfaced as a trusted value.
 */
export function validateExtraction(raw: RawLabReportExtraction): LabReportExtraction {
  const fields: ExtractedOcrField[] = [];
  const warnings: string[] = [];

  for (const field of raw.fields ?? []) {
    const testName = cleanText(field.testName);
    if (!testName) {
      warnings.push('A biomarker was missing a test name and was skipped.');
      continue;
    }

    const value = toFiniteNumber(field.value);
    if (value === null) {
      warnings.push(`"${testName}" had no readable numeric result and was skipped.`);
      continue;
    }

    const reference = CLINICAL_REFERENCE_RANGES[testName];
    const confidence = normalizeConfidence(field.confidence);
    const classification = classifyLabResult(testName, value);
    const lowConfidence = isLowConfidence(confidence);

    const referenceMin = toFiniteNumber(field.referenceMin) ?? reference?.min ?? 0;
    const referenceMax = toFiniteNumber(field.referenceMax) ?? reference?.max ?? 100;

    if (!reference) {
      warnings.push(`"${testName}" is not in the configured reference-range library; using report range.`);
    }

    const unit = cleanText(field.unit) ?? reference?.unit ?? '';
    const panel: LabPanelType = reference?.panel ?? guessPanel(unit) ?? 'Blood Sugar';

    fields.push({
      testName,
      panel,
      extractedValue: value,
      unit,
      confidence,
      isLowConfidence: lowConfidence,
      referenceMin,
      referenceMax,
      status: classification.status,
      verified: !lowConfidence,
      rawValue: cleanText(field.rawValue) ?? String(field.value),
      note: cleanText(field.note),
    });
  }

  const patientName = cleanText(raw.patient?.patientName);
  const testDate = cleanExtractedDate(raw.testDate);
  const laboratory = cleanText(raw.laboratory);
  const patientConfidence = normalizeConfidence(raw.patient?.confidence);

  return {
    patient: raw.patient
      ? {
          patientName,
          patientId: cleanText(raw.patient.patientId),
          dateOfBirth: cleanText(raw.patient.dateOfBirth),
          confidence: patientConfidence,
        }
      : undefined,
    testDate,
    laboratory,
    fields,
    warnings,
  };
}

function guessPanel(unit: string): LabPanelType | undefined {
  const u = unit.toLowerCase();
  if (u.includes('/dl') || u.includes('%')) return 'Blood Sugar';
  return undefined;
}

function cleanExtractedDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = String(value).match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : undefined;
}
