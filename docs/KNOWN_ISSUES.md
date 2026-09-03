# HealthSpan Known Issues

## KI-001 — JSON Persistence Is Not Production-Scale

### Status

Open

### Impact

High for production/multi-instance deployment.

### Description

The MVP stores user data in JSON files. Concurrent writes, horizontal scaling, backups, transactions, and operational recovery are limited.

### Workaround

Use a single controlled deployment with persistent storage and centralized repository writes.

### Planned Resolution

Replace the JSON repository with a transactional database repository while preserving domain/service interfaces.

---

## KI-002 — OCR Provider Selection

### Status

Closed (resolved — see ADR-014)

### Impact

Medium

### Description

The product requires OCR upload and review. The implementation and provider were
previously not finalized.

### Resolution

A real LLM provider (OpenAI-compatible HTTP endpoint) is implemented behind the
abstraction `lib/ocr/provider.ts`:

- `app/api/ocr-scan` is authenticated and reads the actual uploaded file.
- Local OCR text via tesseract.js (images) / pdfjs text layer (PDFs), where the
  pdf.js worker is resolved as a Turbopack asset URL via
  `new URL('pdfjs-dist/...', import.meta.url)` (see `docs/FIXES.md`, FIX-001)
  so its runtime `import(workerSrc)` loads a real emitted file instead of a
  mangled `[project]` module specifier, then
  structured JSON extraction via any OpenAI-compatible `/chat/completions` endpoint.
- Results are schema-validated and confidence-scored (`<85%` = low confidence) and
  remain candidates until the user confirms them.
- Optional `testDate` / `laboratory` / `patientName` metadata is persisted on confirmed
  records.

Provider configuration is exposed in `.env.example` and consumed in `lib/ocr/llmProvider.ts`:

```text
LLM_PROVIDER_BASE_URL=https://api.openai.com/v1
LLM_PROVIDER_API_KEY=
LLM_MODEL=gpt-4o-mini
```

When `LLM_PROVIDER_API_KEY` is absent the app returns a deterministic fallback
labelled `fallback: true` for dev/demo.

> **Base URL gotcha (viable to hit when switching providers):** the client does
> `POST {LLM_PROVIDER_BASE_URL}/chat/completions`. That base URL must therefore be
> an *OpenAI-compatible base*, not a full endpoint or a provider root. For Google
> Gemini use `https://generativelanguage.googleapis.com/v1beta/openai` — the bare
> root (`https://generativelanguage.googleapis.com`) or `/v1beta` produce a 404.

### Remaining scope

Real-time OCR needs either an LLM key or tesseract language data at runtime; see KI-006.

---

## KI-003 — Email Provider Not Yet Selected

### Status

Open

### Impact

Medium

### Description

Digest configuration and preview can be implemented independently, but actual email delivery requires a provider.

### Workaround

Use a development email adapter that renders/logs the generated message without sending real mail.

### Planned Resolution

Select an email provider and implement the adapter.

---

## KI-004 — Reference Ranges Require Product/Clinical Review

### Status

Open

### Impact

High

### Description

Reference ranges vary by metric, unit, laboratory, demographic context, and clinical setting. The MVP needs an explicitly reviewed configuration before being used for real medical decisions.

### Workaround

Treat configured ranges as product rules and display their source/context where appropriate. Keep wording non-diagnostic.

### Planned Resolution

Define and review the reference-range policy before any production clinical use.

---

## KI-005 — Health Score Is an MVP Heuristic

### Status

Open

### Impact

High

### Description

The MVP Health Score is a product-level summary rather than a clinically validated health score.

### Workaround

Expose the score components and clearly state that the score is informational.

### Planned Resolution

If the product is ever intended for clinical use, establish a medically reviewed and appropriately validated scoring methodology.

---

## KI-006 — Scanned-Image PDFs Are Not OCR'd Server-Side

### Status

Open

### Impact

Medium

### Description

The server-side PDF path reads the embedded text layer via `pdfjs-dist`. Text-based
digital lab exports (Quest/LabCorp/EHR) work, but scanned-image PDFs (with no embedded
text) yield no text. Extracting them would require rendering each page to an image
(a native/canvas dependency) before running tesseract.

### Workaround

For scanned PDFs, flatten them to PNG/JPEG and upload an image, which the image OCR
path handles.

### Planned Resolution

Add offline PDF page rendering (e.g. a canvas native dependency) then OCR each rendered page.

---

## KI-007 — Real OCR Requires One-Time Language Data

### Status

Open

### Impact

Low (dev only)

### Description

The real OCR path lazily loads `tesseract.js` and its English language data, and the
LLM requires `LLM_PROVIDER_API_KEY`. In an offline/CI environment without these, the
route falls back to deterministic demo data (`fallback: true`).

### Workaround

For real extraction in production, configure `LLM_PROVIDER_API_KEY` (and the optional
base URL / model) and ensure tesseract language data is reachable at runtime.

### Planned Resolution

Vend/cache tesseract language data at deploy time and document the required env vars
(see `.env.example`).
