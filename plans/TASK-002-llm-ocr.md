# TASK-002 — LLM-Powered OCR for Laboratory Reports

Status: COMPLETE
Priority: HIGH
Dependencies: TASK-001 (authentication + PostgreSQL)

> Implemented. Real LLM provider (OpenAI-compatible HTTP) behind an abstraction,
> tesseract.js local file→text, schema validation + confidence, authenticated
> `/api/ocr-scan`, and optional testDate/laboratory/patientName persistence.
> 37 tests pass; `npm run build` / `npm run lint` / `tsc --noEmit` pass.

## Objective

Replace the hardcoded/mock laboratory OCR implementation with a real,
LLM-powered document extraction service kept behind an abstraction, wired to
the existing review/confirmation flow and PostgreSQL persistence.

## Flow

```
Upload
  → OCR/LLM provider (server-side)
  → Structured extraction
  → Schema validation
  → Confidence evaluation
  → User review (low-confidence editable + amber)
  → Confirmation
  → PostgreSQL
```

## Decisions (approved)

- Provider: OpenAI-compatible HTTP endpoint (LLM_PROVIDER_BASE_URL +
  LLM_PROVIDER_API_KEY + LLM_MODEL). No vendor SDK; generic HTTP + structured JSON.
- File → text: tesseract.js locally (PDF/PNG/JPEG) to get text, then LLM for
  structured extraction.
- Confidence gate: keep existing <85% = low confidence (per-field), amber + editable.
- Persist minimal metadata: optional `testDate`, `laboratory`, `patientName`
  carried onto persisted lab result records where available.

## Deliverables

- OCR provider abstraction (`lib/ocr/provider.ts`).
- OpenAI-compatible LLM provider (`lib/ocr/llmProvider.ts`) — server-side only.
- File-to-text via tesseract.js (`lib/ocr/textExtractor.ts`).
- Schema validation (`lib/ocr/validation.ts`).
- Confidence evaluation (`lib/ocr/confidence.ts`).
- Domain types in `lib/types.ts` (`LabReportExtraction`, extended field types).
- Reworked `app/api/ocr-scan/route.ts` (authenticated, reads real file).
- Updated `components/lab-results/OcrUploadModal.tsx` (real upload, patient/test-date/lab, per-field confidence).
- Minimal metadata persistence on `LabResultRecord` (testDate/laboratory) + repository save.
- Tests: validation, confidence, provider JSON parsing, round-trip.
- Docs sync.

## Definition of Done

- Actual uploaded file is extracted (not a hardcoded profile).
- Extraction runs server-side, authenticated, schema-validated, confidence-scored.
- Unreviewed output is not persisted as trusted data.
- Low-confidence fields are clearly flagged and editable.
- Existing functionality (manual entry, dashboard, insights, export, deletion) still works.
- `npm test` / `npm run build` / `npm run lint` pass.
- Docs (PROJECT/ARCHITECTURE/DEVELOPMENT/CURRENT/TASKS/DECISIONS/FIXES/KNOWN_ISSUES/AGENTS) updated.
