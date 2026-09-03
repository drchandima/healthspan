import { RawLabReportExtraction } from '@/lib/types';

/**
 * Deterministic development fallback used when no LLM provider is configured
 * (no LLM_PROVIDER_API_KEY). It returns rich sample data so the review/confirm
 * UX can be exercised without any network, tesseract, or LLM calls.
 *
 * This is NOT trusted real extraction — it is explicitly labelled as a
 * fallback and must never be presented as genuine OCR output.
 */
const SAMPLE_FIELDS: RawLabReportExtraction['fields'] = [
  { testName: 'Fasting Blood Sugar', value: '118', unit: 'mg/dL', referenceMin: '70', referenceMax: '110', confidence: 96, rawValue: '118' },
  { testName: 'HbA1c', value: '6.1', unit: '%', referenceMin: '4.0', referenceMax: '5.6', confidence: 94, rawValue: '6.1' },
  { testName: 'Total Cholesterol', value: '224', unit: 'mg/dL', referenceMin: '125', referenceMax: '200', confidence: 98, rawValue: '224' },
  { testName: 'LDL Cholesterol', value: '142', unit: 'mg/dL', referenceMin: '0', referenceMax: '100', confidence: 78, rawValue: '142?', note: 'Digit partially obscured; verify.' },
  { testName: 'HDL Cholesterol', value: '39', unit: 'mg/dL', referenceMin: '40', referenceMax: '60', confidence: 92, rawValue: '39' },
  { testName: 'Triglycerides', value: '185', unit: 'mg/dL', referenceMin: '10', referenceMax: '150', confidence: 95, rawValue: '185' },
];

export function fallbackRawExtraction(): RawLabReportExtraction {
  return {
    patient: {
      patientName: 'Sample Patient',
      confidence: 90,
    },
    testDate: new Date().toISOString().slice(0, 10),
    laboratory: 'Fallback Lab (no LLM configured)',
    fields: SAMPLE_FIELDS.map((f) => ({ ...f })),
  };
}
