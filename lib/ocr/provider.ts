import { LabReportExtraction, OcrScanResult } from '@/lib/types';
import { isLlmConfigured, extractWithLlm } from './llmProvider';
import { extractTextFromFile, OcrInputFile } from './textExtractor';
import { validateExtraction } from './validation';
import { fallbackRawExtraction } from './mockProvider';

export type { OcrInputFile } from './textExtractor';
export { isLlmConfigured } from './llmProvider';
export { LOW_CONFIDENCE_THRESHOLD, isLowConfidence } from './confidence';

/**
 * The single OCR entry point used by the /api/ocr-scan route.
 *
 * When a real LLM provider is configured it runs: file -> OCR text -> LLM ->
 * validate -> confidence score. Otherwise it returns the deterministic dev
 * fallback (labelled `fallback: true`) so the product remains usable with no
 * external credentials. In BOTH cases the result is only a candidate until the
 * user confirms it in the review UI.
 */
export async function extractLabReport(
  file: OcrInputFile,
  filename: string
): Promise<Omit<OcrScanResult, 'processedAt'>> {
  const realOcr = isLlmConfigured();

  const raw = realOcr ? await runRealOcr(file) : fallbackRawExtraction();
  const document: LabReportExtraction = validateExtraction(raw);

  const lowConfidenceCount = document.fields.filter((f) => f.isLowConfidence).length;

  return {
    success: true,
    filename,
    extractedCount: document.fields.length,
    lowConfidenceCount,
    document,
    fallback: !realOcr,
  };
}

async function runRealOcr(file: OcrInputFile): Promise<ReturnType<typeof fallbackRawExtraction>> {
  if (!isLlmConfigured()) {
    throw new Error('LLM provider is not configured.');
  }
  const text = await extractTextFromFile(file);
  if (!text || text.length < 10) {
    throw new Error('No readable text could be extracted from the document.');
  }
  return extractWithLlm(text);
}
