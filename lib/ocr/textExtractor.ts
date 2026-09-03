export type OcrInputFile = {
  name: string;
  mimeType?: string;
  buffer: ArrayBuffer;
};

/**
 * Runs tesseract.js locally (plus pdfjs-dist for PDF page rendering) to
 * convert an uploaded lab report (PNG/JPEG or text-based PDF) into plain text
 * for the LLM provider.
 *
 * Uses dynamic imports so that the heavy worker assets are only pulled in when
 * the real OCR path runs.
 */
export async function extractTextFromFile(file: OcrInputFile): Promise<string> {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.pdf') || file.mimeType === 'application/pdf') {
    return extractPdfText(file.buffer);
  }
  return recognizeImage(new Uint8Array(file.buffer));
}

async function recognizeImage(imageData: Uint8Array): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  const buffer = Buffer.from(imageData);
  try {
    const { data } = await worker.recognize(buffer);
    return (data.text || '').trim();
  } finally {
    await worker.terminate();
  }
}

/**
 * Text-based lab report PDFs (digital Quest/LabCorp/EHR exports) embed a text
 * layer, which pdfjs-dist can read directly without any image rendering or
 * native dependencies. Scanned-image PDFs yield no embedded text and should be
 * rendered to images before OCR; that path is out of scope for server-side here.
 */
async function extractPdfText(pdfBuffer: ArrayBuffer): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // pdf.js loads its worker via `import(GlobalWorkerOptions.workerSrc)`. Point it
  // at a real runtime asset URL using the Next.js/Turbopack-supported
  // `new URL(packagePath, import.meta.url)` pattern. This yields a string
  // `file://...` URL that the bundler emits as an asset and the runtime dynamic
  // import can load — avoiding the mangled `[project]/... [app-route]` specifier
  // produced when workerSrc is assigned a bare filesystem path.
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.mjs',
    import.meta.url,
  ).toString();

  const pdf = await getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
  try {
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => (item as { str?: string }).str ?? '')
        .join(' ');
      fullText += pageText.concat('\n');
    }
    return fullText.trim();
  } finally {
    void pdf.cleanup();
  }
}
