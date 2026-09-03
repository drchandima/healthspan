export { extractLabReport } from './provider';
export { isLlmConfigured, extractWithLlm } from './llmProvider';
export { extractTextFromFile } from './textExtractor';
export { validateExtraction } from './validation';
export { normalizeConfidence, isLowConfidence, LOW_CONFIDENCE_THRESHOLD } from './confidence';
export type { OcrInputFile } from './textExtractor';
