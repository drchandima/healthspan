import { describe, it, expect } from 'vitest';
import { validateExtraction } from '@/lib/ocr/validation';
import { RawLabReportExtraction } from '@/lib/types';

describe('validateExtraction', () => {
  it('normalizes a valid field using the reference-range library', () => {
    const raw: RawLabReportExtraction = {
      testDate: '2026-08-20',
      laboratory: 'Quest Diagnostics',
      patient: { patientName: 'Jane Doe', confidence: 92 },
      fields: [
        {
          testName: 'Fasting Blood Sugar',
          value: '118',
          unit: 'mg/dL',
          referenceMin: '70',
          referenceMax: '110',
          confidence: 96,
          rawValue: '118',
        },
      ],
    };

    const doc = validateExtraction(raw);
    expect(doc.testDate).toBe('2026-08-20');
    expect(doc.laboratory).toBe('Quest Diagnostics');
    expect(doc.patient?.patientName).toBe('Jane Doe');

    const field = doc.fields[0];
    expect(field.testName).toBe('Fasting Blood Sugar');
    expect(field.panel).toBe('Blood Sugar');
    expect(field.extractedValue).toBe(118);
    expect(field.unit).toBe('mg/dL');
    expect(field.confidence).toBe(96);
    expect(field.isLowConfidence).toBe(false);
    expect(field.verified).toBe(true);
    expect(field.status).toBe('borderline');
    expect(field.referenceMin).toBe(70);
    expect(field.referenceMax).toBe(110);
  });

  it('flags low-confidence fields and marks them unverified', () => {
    const raw: RawLabReportExtraction = {
      fields: [{ testName: 'LDL Cholesterol', value: '142', confidence: 78 }],
    };
    const doc = validateExtraction(raw);
    expect(doc.fields[0].isLowConfidence).toBe(true);
    expect(doc.fields[0].verified).toBe(false);
  });

  it('skips fields missing a test name and records a warning', () => {
    const raw: RawLabReportExtraction = {
      fields: [
        { value: '5.0', unit: 'x' },
        { testName: 'HbA1c', value: '6.1', confidence: 95 },
      ],
    };
    const doc = validateExtraction(raw);
    expect(doc.fields.length).toBe(1);
    expect(doc.fields[0].testName).toBe('HbA1c');
    expect(doc.warnings.length).toBeGreaterThan(0);
  });

  it('skips fields with an unreadable numeric result and records a warning', () => {
    const raw: RawLabReportExtraction = {
      fields: [{ testName: 'Total Cholesterol', value: 'not-a-number' }],
    };
    const doc = validateExtraction(raw);
    expect(doc.fields.length).toBe(0);
    expect(doc.warnings.length).toBeGreaterThan(0);
  });

  it('warns (but keeps) a field not present in the reference library', () => {
    const raw: RawLabReportExtraction = {
      fields: [{ testName: 'Unknown Biomarker X', value: '42', confidence: 90 }],
    };
    const doc = validateExtraction(raw);
    expect(doc.fields.length).toBe(1);
    expect(doc.warnings.some((w) => w.includes('not in the configured'))).toBe(true);
  });

  it('extracts a YYYY-MM-DD test date from loose strings', () => {
    const raw: RawLabReportExtraction = {
      testDate: 'Report date: 2026-08-20',
      fields: [{ testName: 'Hemoglobin', value: '14.8', confidence: 98 }],
    };
    const doc = validateExtraction(raw);
    expect(doc.testDate).toBe('2026-08-20');
  });
});
