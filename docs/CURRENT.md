# Current State

## Current Objective

Maintain the PostgreSQL-backed, authenticated HealthSpan MVP and extend it with real LLM-powered OCR for laboratory reports (extraction → review → confirm → persistence), keeping docs in sync.

## Last Completed

- Persistence migrated from JSON to a project-local PostgreSQL 18 cluster (gitignored `.pgdata/`, port 5433).
- Legacy JSON for the admin account (`admin@healthspan.com`, Chandima Jayasinghe) fully migrated to PG (verified FBS=200 preserved).
- iron-session + bcryptjs authentication wired through API routes (`/api/auth/*`, `/api/health-data`, `/api/export`).
- `scripts/init-db.ts`, `scripts/migrate-data.ts`, and `scripts/seed-demo.ts` (db:seed) created.
- Demo account `demo@healthspan.com` / `demo123` seeded and verified (6 body, 21 lab, 3 meds).
- Fixed `jsonb` double-parse bug in `mapAudit` (see `docs/FIXES.md` FIX-001); admin export loads intact.
- **LLM OCR (TASK-002, COMPLETE):**
  - Replaced the hardcoded mock `/api/ocr-scan` with a server-side provider behind an abstraction (`lib/ocr/provider.ts`): file → tesseract.js text → OpenAI-compatible LLM → JSON → schema validation (`lib/ocr/validation.ts`) → per-field confidence (`lib/ocr/confidence.ts`, `<85%` low-confidence threshold).
  - Real LLM is optional: without `LLM_PROVIDER_API_KEY` the route returns a clearly-labelled deterministic fallback (dev/demo) and never presents it as genuine OCR.
  - `/api/ocr-scan` now requires an authenticated session and reads the actual uploaded file (PDF/PNG/JPEG).
  - `OcrUploadModal` uploads a real file, shows patient/test-date/laboratory metadata, keeps the amber low-confidence editable review gate, and persists optional `testDate`/`laboratory`/`patientName` on confirmed lab records.
  - `lab_results` gained idempotent `test_date`/`laboratory`/`patient_name` columns (schema + repository round-trip).
  - Fixed pdf.js worker loading under Next.js Turbopack: the worker is now resolved
    as a Turbopack asset URL via `new URL('pdfjs-dist/...', import.meta.url)` so
    pdf.js's runtime `import(workerSrc)` loads a real emitted file as a string URL,
    avoiding both the mangled `[project]/... [app-route]` specifier and the
    `Invalid workerSrc type` failure (see FIX-001 / KI-002).
  - Provider is wired to Google Gemini via its OpenAI-compatible endpoint
    (`LLM_PROVIDER_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`).
    The base URL must be an OpenAI-compatible base (client appends
    `/chat/completions`) — a bare provider root returns 404 (see KI-002).
  - Tests: 40 pass (18 new OCR + 22 prior); `tsc --noEmit` 0 errors; `npm run lint` 0 errors (75 pre-existing warnings); `npm run build` success.
- Runtime smoke test `scratch/test-endpoints.js` passes: login/session/export/health-data for both accounts; bad password -> 401; unauthenticated export -> 401.

## Currently Working

- Broader docs sync: PROJECT/ARCHITECTURE/DEVELOPMENT/AGENTS still describe the JSON MVP / no-auth model; being reconciled with the PostgreSQL + auth + LLM OCR reality.
- Full security/privacy review pass (data ownership, session secret, export redaction).

## Blockers

- Final email provider has not been selected.
- Clinical/reference-range policy needs explicit configuration and review before any production medical use.
- Server-side OCR covers text-based PDFs and images; scanned-image PDFs (no embedded text layer) require offline rendering and are an open enhancement (see `docs/KNOWN_ISSUES.md`).

## Next Action

Finish reconciling the remaining docs (PROJECT/ARCHITECTURE/DEVELOPMENT/AGENTS) with the PostgreSQL + auth + LLM OCR reality; complete the security/privacy review; verify data-export/deletion behavior; run the full `npm test`/`npm run build` gate before committing.

## Validation State

- Architecture documentation: describes JSON MVP (needs sync to PostgreSQL + LLM OCR).
- Development documentation: needs sync to PostgreSQL + iron-session/bcrypt + LLM OCR.
- Application implementation: PostgreSQL + iron-session/bcrypt + LLM OCR implemented.
- Automated tests: present (`npm test`, 40 tests). Includes OCR validation/confidence/provider tests plus the PostgreSQL repository round-trip with a jsonb regression case.
- Typecheck/lint/build: `tsc` 0 errors; `npm run lint` 0 errors (75 pre-existing warnings); `npm run build` success.
- Production readiness: not applicable (MVP/internal).

## Important Context

The current application is a tracking and decision-support MVP, not a diagnostic medical system.

`admin@healthspan.com`/`admin123` and `demo@healthspan.com`/`demo123` are development/test fixtures only; credentials must never be exposed in production docs, UI, logs, or client source. Passwords are stored only as bcrypt hashes.
