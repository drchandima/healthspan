# HealthSpan Architecture & Technical Decisions

## ADR-001 — Use Next.js App Router

### Status

Accepted

### Decision

Use Next.js with the App Router and TypeScript.

### Reason

HealthSpan needs a modern React UI while also requiring server-side protected operations for sensitive health data and account management.

### Consequence

Interactive charts/forms may use Client Components, but sensitive reads/writes remain server-side.

---

## ADR-002 — Use JSON Files for MVP Persistence

### Status

Accepted

### Decision

Use server-side JSON files for the initial implementation.

### Reason

The requested MVP is an internal/single-account application and needs a simple persistence mechanism.

### Consequence

The repository layer must hide storage details. JSON is not considered the long-term production storage solution.

### Future

Replace the JSON implementation with a transactional database repository without changing the domain/service contracts.

---

## ADR-003 — Make the Domain Tenant-Ready

### Status

Accepted

### Decision

Every user-owned record includes `tenantId` and `userId`.

### Reason

Future multi-tenant support should not require redesigning every aggregate.

### Consequence

The MVP uses a default tenant, but authorization checks must still filter by tenant and user ownership.

---

## ADR-004 — Treat Health Data as Time-Series Events

### Status

Accepted

### Decision

Every health measurement has an explicit `measuredAt` timestamp.

### Reason

Trend analysis and historical visualization depend on the measurement time rather than the time the record was entered.

### Consequence

`measuredAt`, `createdAt`, and `updatedAt` are separate fields.

---

## ADR-005 — Use Repository Interfaces

### Status

Accepted

### Decision

Application services access data through repository interfaces.

### Reason

This separates domain logic from JSON persistence and enables future database migration.

### Consequence

UI components must not read/write JSON files directly.

---

## ADR-006 — Deterministic Health Score for MVP

### Status

Accepted

### Decision

The MVP Health Score is calculated by deterministic, explainable rules.

### Reason

The product requires users to understand which metrics contribute to the score. A deterministic model is easier to test, explain, and audit than an opaque model.

### Consequence

The score must expose component contributions and evidence.

---

## ADR-007 — Separate Abnormality Detection from Risk Insights

### Status

Accepted

### Decision

Reference-range evaluation and trend/risk interpretation are separate stages.

### Reason

A single abnormal value does not necessarily imply a health trend or future risk.

### Consequence

The insight engine receives structured evidence from the abnormality and trend evaluators.

---

## ADR-008 — OCR Results Require Review

### Status

Accepted

### Decision

OCR-extracted laboratory values are candidates until confirmed by the user.

### Reason

OCR can misread values, units, dates, or labels. Health data should not silently become trusted because extraction succeeded.

### Consequence

Low-confidence fields are highlighted in amber with confidence percentage and must be editable.

---

## ADR-009 — No Diagnostic Claims

### Status

Accepted

### Decision

HealthSpan provides tracking, trend analysis, and general risk-oriented insights rather than diagnosis.

### Reason

The MVP is a health-record and decision-support application.

### Consequence

Insights use cautious, plain-language wording and doctor-consult callouts where appropriate.

---

## ADR-010 — Audit Historical Changes

### Status

Accepted

### Decision

Edits and deletions of historical health records create audit events.

### Reason

Health history must remain traceable.

### Consequence

The system records previous/new values or deletion context without exposing sensitive information unnecessarily in logs.

---

## ADR-011 — Provider Adapters for OCR and Notifications

### Status

Accepted

### Decision

External OCR, email, and push services are accessed through adapter interfaces.

### Reason

The provider may change and the MVP should remain testable without hard coupling to one vendor.

### Consequence

Provider credentials and implementation details remain outside domain logic.

---

## ADR-012 — Test Credentials Are Development Fixtures Only

### Status

Accepted

### Decision

`admin@healthspan.com` / `admin123` may be used as the supplied MVP test account.

### Reason

The requirement explicitly specifies a single test account.

### Consequence

The credentials must never be treated as a production secret or embedded in
production-facing documentation or client-side source. Keep such fixtures only in
server-side seed scripts (`scripts/init-db.ts`, `lib/seedData.ts`); the "Quick Demo
Login" UI that hardcoded the admin credentials in `AuthModal.tsx` was removed so the
credentials are no longer exposed to the browser/client.

---

## ADR-013 — PostgreSQL Persistence (replaces ADR-002 JSON)

### Status

Accepted (supersedes the JSON-file implementation of ADR-002)

### Decision

Use PostgreSQL as the persistence layer, accessed through the repository interfaces defined in ADR-005. Remains tenant-ready via `tenantId`/`userId`.

### Reason

The MVP needs transactional, owned, auditable health data rather than JSON files.

### Consequence

`lib/repositories/healthStoreRepository.ts` and `lib/repositories/userRepository.ts` back the domain contracts; `db/schema.sql` is the schema source of truth, applied idempotently by `scripts/init-db.ts`.

---

## ADR-014 — LLM-Powered OCR via an OpenAI-Compatible HTTP Endpoint

### Status

Accepted

### Decision

Lab-report OCR runs server-side as: file → local OCR text (tesseract.js) → structured JSON extraction via any OpenAI-compatible `/chat/completions` endpoint (`LLM_PROVIDER_BASE_URL` + `LLM_PROVIDER_API_KEY` + `LLM_MODEL`) → schema validation → per-field confidence. No vendor SDK is used.

### Reason

A generic HTTP endpoint keeps the provider swappable (ADR-011) and avoids coupling to one vendor SDK.

### Consequence

Extraction is a candidate only (ADR-008); results are validated and confidence-scored. When no `LLM_PROVIDER_API_KEY` is configured, `/api/ocr-scan` returns a deterministic fallback clearly labelled `fallback: true` — it is never presented as genuine OCR.

---

## ADR-015 — Preserve Minimal Extraction Metadata

### Status

Accepted

### Decision

Confirmed OCR lab records may carry optional `testDate`, `laboratory`, and `patientName` read from the report, persisted alongside the measured values.

### Reason

Retaining the source context (which lab, which test date, which patient) supports audit and review without inflating scope.

### Consequence

`lab_results` gained `test_date`/`laboratory`/`patient_name` columns; the persisted timestamp remains the explicit measurement time (see ADR-004) and is never overwritten by the report's test date.
