import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/authService';
import { extractLabReport } from '@/lib/ocr/provider';
import { validateExtraction } from '@/lib/ocr/validation';
import { fallbackRawExtraction } from '@/lib/ocr/mockProvider';
import { toHttpError } from '@/lib/http';

/**
 * POST /api/ocr-scan — parse an uploaded lab report (PDF/PNG/JPEG).
 *
 * Requires an authenticated session. When a real LLM provider is configured it
 * runs OCR (tesseract.js locally) + LLM structured extraction; otherwise it
 * returns a deterministic development fallback. In both cases the result is
 * only a candidate that must be confirmed by the user before persistence.
 */
export async function POST(request: NextRequest) {
  try {
    await requireSession();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const filename = file?.name || 'Uploaded_Lab_Report.pdf';

    const result = file
      ? await extractLabReport(
          { name: file.name, mimeType: file.type, buffer: await file.arrayBuffer() },
          filename
        )
      : buildNoFileFallback(filename);

    return NextResponse.json({
      success: true,
      filename: result.filename,
      extractedCount: result.extractedCount,
      lowConfidenceCount: result.lowConfidenceCount,
      fields: result.document.fields,
      document: result.document,
      fallback: result.fallback,
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error in OCR scan API:', err);
    const e = toHttpError(err);
    return NextResponse.json({ success: false, error: e.message }, { status: e.status });
  }
}

function buildNoFileFallback(filename: string) {
  const document = validateExtraction(fallbackRawExtraction());
  return {
    success: true,
    filename,
    extractedCount: document.fields.length,
    lowConfidenceCount: document.fields.filter((f) => f.isLowConfidence).length,
    document,
    fallback: true,
  };
}
