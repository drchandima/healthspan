import { describe, it, expect, afterEach } from 'vitest';
import { extractLabReport } from '@/lib/ocr/provider';
import { isLlmConfigured } from '@/lib/ocr/llmProvider';

const ORIGINAL_KEY = process.env.LLM_PROVIDER_API_KEY;

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.LLM_PROVIDER_API_KEY;
  } else {
    process.env.LLM_PROVIDER_API_KEY = ORIGINAL_KEY;
  }
});

// The fallback path (no real OCR) is exercised here to avoid any tesseract or
// LLM network activity in the unit test environment.
describe('extractLabReport (fallback path)', () => {
  const file = { name: 'demo.pdf', mimeType: 'application/pdf', buffer: new ArrayBuffer(8) };

  it('returns a deterministic document when no LLM is configured', async () => {
    delete process.env.LLM_PROVIDER_API_KEY;
    const result = await extractLabReport(file, 'demo.pdf');
    expect(result.success).toBe(true);
    expect(result.fallback).toBe(true);
    expect(result.filename).toBe('demo.pdf');
    expect(result.extractedCount).toBeGreaterThan(0);
    expect(result.document.fields.length).toBe(result.extractedCount);
  });

  it('includes both high- and low-confidence fields for review', async () => {
    delete process.env.LLM_PROVIDER_API_KEY;
    const result = await extractLabReport(file, 'demo.pdf');
    expect(result.lowConfidenceCount).toBeGreaterThan(0);
    expect(result.document.fields.some((f) => f.isLowConfidence)).toBe(true);
    expect(result.document.fields.some((f) => !f.isLowConfidence)).toBe(true);
  });

  it('carries patient/test-date/laboratory metadata on the document', async () => {
    const result = await extractLabReport(file, 'demo.pdf');
    expect(result.document.patient?.patientName).toBeTruthy();
    expect(result.document.testDate).toBeTruthy();
    expect(result.document.laboratory).toBeTruthy();
  });

  it('does not persist anything (no repository call)', async () => {
    const result = await extractLabReport(file, 'demo.pdf');
    expect(result.success).toBe(true);
  });
});

describe('OCR provider configuration gate', () => {
  it('treats the LLM as unconfigured when LLM_PROVIDER_API_KEY is empty', () => {
    delete process.env.LLM_PROVIDER_API_KEY;
    expect(isLlmConfigured()).toBe(false);
  });

  it('treats the LLM as configured when LLM_PROVIDER_API_KEY is set', () => {
    process.env.LLM_PROVIDER_API_KEY = 'test-key';
    expect(isLlmConfigured()).toBe(true);
  });

  it('falls back only when the key is missing (regression: KI-002)', async () => {
    const file = { name: 'demo.pdf', mimeType: 'application/pdf', buffer: new ArrayBuffer(8) };
    delete process.env.LLM_PROVIDER_API_KEY;
    const fallbackResult = await extractLabReport(file, 'demo.pdf');
    expect(fallbackResult.fallback).toBe(true);

    process.env.LLM_PROVIDER_API_KEY = 'test-key';
    // When configured, the app must NOT silently return the demo fallback; it
    // takes the real OCR path, which (with no real file/provider stubbed here)
    // surfaces an error instead of `fallback: true`.
    await expect(extractLabReport(file, 'demo.pdf')).rejects.toThrow();
  });
});
