# Current State

## Current Objective

Maintain the PostgreSQL-backed, authenticated HealthSpan MVP and extend it with real LLM-powered OCR for laboratory reports (extraction → review → confirm → persistence) and LLM-assisted health insight explanations (TASK-003), keeping docs in sync.

## Last Completed

- **LLM-Powered Health Insights (TASK-003, COMPLETE):**
  - New `lib/insights/` layer with strict separation of concerns (ADR-016):
    - `deterministicEngine.ts` builds a compact `StructuredEvidence` snapshot client-agnostically: Health Score + component breakdown, metric statuses (from `lib/referenceRanges.ts` classifiers), percentage changes, and the deterministic `riskPredictionEngine` findings. The LLM never computes score/ranges/trends.
    - `llmProvider.ts` is an OpenAI-compatible `/chat/completions` client reusing the same env vars as OCR (`LLM_PROVIDER_BASE_URL`/`LLM_PROVIDER_API_KEY`/`LLM_MODEL`).
    - `validation.ts` drops malformed/unsafe fields (diagnostic claims like "you will develop…", invented `sourceId`s) per-field with warnings.
    - `mockProvider.ts` — deterministic fallback enrichment labelled `fallback: true` (no LLM key / failure).
  - New authenticated route `GET /api/insights` returns `{ deterministic, enriched?, fallback }`; computed server-side on demand, never persisted.
  - UI: `InsightsEngineTab` gained an "AI-Assisted Explanations" section (`EnrichedInsightCard`) with explicit LLM-Explained / Deterministic Fallback source badges; deterministic insights, score, and dashboard/notifications surfaces are unchanged.
  - Verified end-to-end against Gemini: login → `/api/insights` returns `fallback: false` with validated explanations and deterministic score 86/Good.
- **Test infra fix (FIX-003):** vitest now loads `.env.local` (`vitest.setup.ts`) so the PostgreSQL repository round-trip test connects to Docker DB (previously failed SCRAM auth with the passwordless fallback URL). The setup explicitly unsets the LLM key/env so unit tests stay keyless and deterministic (OCR tests restored to their intended baseline).
- Persistence runs in PostgreSQL 18 via Docker (`docker-compose.yml`, container `healthspan-db`, host port **5433**, `restart: always`). The earlier project-local cluster (gitignored `.pgdata/`) was retired to avoid a port-5433 conflict; DB data now lives in the named Docker volume `healthspan-pgdata`.
- Database scripts: `npm run db:start` / `db:stop` (docker compose), `db:init`, `db:migrate`, `db:seed`.
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
- Tests: **52 pass** (8 new insights + 7 OCR provider + 18 other OCR + prior); `tsc --noEmit` 0 errors; `npm run lint` 0 errors (73 pre-existing warnings); `npm run build` success. The PostgreSQL round-trip/regression test now runs green against the Docker DB.
- Runtime smoke test `scratch/test-endpoints.js` passes: login/session/export/health-data for both accounts; bad password -> 401; unauthenticated export -> 401. `/api/insights` verified authenticated (200, `fallback: false` with Gemini configured).

## Currently Working

- Broader docs sync: PROJECT/ARCHITECTURE/DEVELOPMENT/AGENTS still describe the JSON MVP / no-auth model; being reconciled with the PostgreSQL + auth + LLM OCR + LLM insights reality.
- Full security/privacy review pass (data ownership, session secret, export redaction).

## Blockers

- Final email provider has not been selected.
- Clinical/reference-range policy needs explicit configuration and review before any production medical use.
- Server-side OCR covers text-based PDFs and images; scanned-image PDFs (no embedded text layer) require offline rendering and are an open enhancement (see `docs/KNOWN_ISSUES.md`).
- LLM-assisted explanations run on demand with no persistence/caching; insight content depends on provider availability at request time (see `docs/KNOWN_ISSUES.md` KI-008).

## Next Action

Finish reconciling the remaining docs (PROJECT/ARCHITECTURE/DEVELOPMENT/AGENTS) with the PostgreSQL + auth + LLM OCR + LLM insights reality; complete the security/privacy review; verify data-export/deletion behavior; run the full `npm test`/`npm run build` gate before committing.

## Validation State

- Architecture documentation: describes JSON MVP (needs sync to PostgreSQL + LLM OCR + LLM insights).
- Development documentation: needs sync to PostgreSQL + iron-session/bcrypt + LLM OCR + LLM insights.
- Application implementation: PostgreSQL + iron-session/bcrypt + LLM OCR + LLM insights implemented.
- Automated tests: present (`npm test`, 52 tests). Includes OCR validation/confidence/provider tests, the PostgreSQL repository round-trip with a jsonb regression case, and insights deterministic/validation/fallback tests.
- Typecheck/lint/build: `tsc` 0 errors; `npm run lint` 0 errors (73 pre-existing warnings); `npm run build` success.
- Production readiness: not applicable (MVP/internal).

## Important Context

The current application is a tracking and decision-support MVP, not a diagnostic medical system.

`admin@healthspan.com`/`admin123` and `demo@healthspan.com`/`demo123` are development/test fixtures only; credentials must never be exposed in production docs, UI, logs, or client source. Passwords are stored only as bcrypt hashes.
