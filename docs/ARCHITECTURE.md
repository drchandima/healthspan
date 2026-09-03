# HealthSpan Architecture

## Architecture Style

Use a modular Next.js application with clear domain boundaries.

The MVP is a single-account application, but the domain and repository contracts are tenant-ready and persistence is PostgreSQL (tenant-ready), so the persistence layer can later back multi-tenant without rewriting the UI and business rules.

## High-Level Structure

```text
Browser
  |
  v
Next.js App Router
  |
  +-- UI / Pages / Components
  |
  +-- Route Handlers (protected by requireSession)
  |
  +-- Application Services
  |
  +-- Domain Rules
  |
  +-- Repository Interfaces
  |
  +-- PostgreSQL Repository (pg)
  |
  +-- Adapters / Modules
       +-- OCR (lib/ocr: textExtractor + llmProvider + validation + confidence)
       +-- Email
       +-- Push notifications
```

## Recommended Source Layout

```text
src/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   └── api/
├── components/
│   ├── ui/
│   ├── charts/
│   ├── metrics/
│   └── forms/
├── domains/
│   ├── auth/
│   ├── profile/
│   ├── body-metrics/
│   ├── lifestyle/
│   ├── labs/
│   ├── health-score/
│   ├── insights/
│   ├── notifications/
│   └── settings/
├── lib/
│   ├── auth/
│   ├── validation/
│   ├── dates/
│   └── audit/
├── repositories/
│   ├── interfaces/
│   └── json/
└── adapters/
    ├── ocr/
    ├── email/
    └── notifications/
```

## Domain Boundaries

### Authentication

Responsible for login, session handling, password change, and account deletion authorization.

### Profile

Responsible for user identity/profile information and account-level biometrics.

### Body Metrics

Responsible for single-value and multi-value measurements, BMI calculation, reference ranges, historical edits, deletion, and audit records.

### Lifestyle

Responsible for sleep, exercise, diet, alcohol, smoking, and medications.

### Labs

Responsible for laboratory measurements, reference ranges, abnormality status, report uploads, OCR extraction, confidence, and review/confirmation.

### Health Score

Responsible only for calculating the score and its component breakdown. It must not own presentation components.

### Insights

Responsible for evaluating deterministic rules against time-series data and producing structured insight objects.

### Notifications

Responsible for digest preferences, notification channels, email preview data, and future in-app/push delivery.

### Settings

Responsible for profile editing, password change, 2FA readiness, data export, privacy information, and account deletion.

## Tenant-Ready Data Model

Every user-owned aggregate should carry:

```text
tenantId
userId
id
createdAt
updatedAt
```

Example:

```text
HealthRecord
- id
- tenantId
- userId
- metricType
- value
- unit
- measuredAt
- source
- createdAt
- updatedAt
```

The MVP may use:

```text
tenantId = "default"
userId = "admin"
```

The application must not assume that a user can access every record in the JSON store.

## Persistence (PostgreSQL)

Persistence is PostgreSQL, accessed through repository interfaces
(`lib/repositories/healthStoreRepository.ts`, `lib/repositories/userRepository.ts`)
backed by parameterized queries and transactions. The schema source of truth is
`db/schema.sql`, applied idempotently by `scripts/init-db.ts` (which also seeds the
tenant, admin account, and notification preferences).

Tenant/user ownership is enforced in every query via `tenantId` + `userId`
(`tenant-ready` from ADR-003), and route handlers enforce a server-side session via
`requireSession()` before any sensitive read/write.

The repository hides all SQL details from the UI; components never touch the database
directly.

Repository interface example:

```text
HealthSpanStoreRepository
  load(userId, tenantId)
  save(store)            // single aggregate write in a transaction
AccountRepository
  findByEmail(...)
  create(...)
  updatePassword(...)
  deleteUserCascade(...)
```

## Time-Series Representation

A record should preserve the measurement timestamp separately from persistence timestamps.

Example:

```json
{
  "id": "hr_001",
  "tenantId": "default",
  "userId": "admin",
  "metricType": "weight",
  "value": 45,
  "unit": "kg",
  "measuredAt": "2026-07-04T12:46:00+05:30",
  "source": "manual",
  "createdAt": "2026-07-04T12:47:00+05:30",
  "updatedAt": "2026-07-04T12:47:00+05:30"
}
```

## Audit Trail

Do not overwrite historical meaning silently.

For edits/deletes, create an audit event containing:

- event ID
- tenant ID
- user ID
- entity ID
- entity type
- action
- previous value
- new value, if applicable
- reason, if supplied
- timestamp

## Health Score Architecture

```text
Time-series records
        |
        v
Reference-range evaluator
        |
        +----> Abnormality status
        |
        v
Trend analyzer
        |
        v
Score components
        |
        v
Overall Health Score
```

The score should be deterministic and explainable.

Each component should expose:

- component name
- score contribution
- maximum contribution
- status
- supporting metrics
- reason

## Insight Architecture

```text
Health records
    |
    +--> abnormality rules
    |
    +--> trend rules
    |
    +--> cross-metric rules
    |
    v
Insight engine
    |
    v
Structured insight
    |
    +--> severity
    +--> title
    +--> finding
    +--> evidence
    +--> recommendation
    +--> doctorConsultCallout
```

## Example Cross-Metric Rule

If:

- weight has a sustained upward trend,
- exercise duration has a sustained downward trend,
- fasting blood sugar has a sustained upward trend,

generate a warning-oriented risk insight.

Do not state that diabetes will develop. Use wording such as:

> "The recent pattern across weight, activity, and fasting blood sugar may indicate increasing metabolic risk. Consider discussing these changes with a qualified healthcare professional and reviewing activity, diet, and other relevant factors."

## Reference Ranges

Reference ranges must be represented as data/configuration, not repeated as magic numbers across components.

The evaluator should return:

```text
NORMAL
LOW
HIGH
CRITICAL_LOW
CRITICAL_HIGH
UNKNOWN
```

Reference ranges should include unit and contextual metadata where needed.

## OCR Flow

OCR runs entirely server-side behind an abstraction (`lib/ocr/provider.ts`) guarded by
`requireSession()`. With an LLM configured it is:

```text
Upload (PDF / PNG / JPEG)
    |
    v
Local OCR text (tesseract.js: images, or pdfjs text layer for text-based PDFs)
    |
    v
LLM structured extraction (OpenAI-compatible HTTP, lib/ocr/llmProvider.ts)
    |
    v
Schema validation (lib/ocr/validation.ts) -> only valid fields pass
    |
    v
Per-field confidence evaluation (lib/ocr/confidence.ts, <85% = low)
    |
    +--> high confidence --> editable review
    |
    +--> low confidence --> amber highlight + confidence %
    |
    v
User confirms/edits (OcrUploadModal)
    |
    v
Persist lab results to PostgreSQL (only after confirmation)
```

Without `LLM_PROVIDER_API_KEY` the route returns a deterministic fallback labelled
`fallback: true` (dev/demo) — it is never presented as genuine OCR.

No OCR result should become trusted health data merely because extraction produced it;
results are candidates until the user confirms.

## Notifications

Use a provider/adapter boundary:

```text
NotificationService
    |
    +-- EmailNotificationAdapter
    +-- InAppNotificationAdapter
    +-- PushNotificationAdapter
```

The MVP can implement email digest generation and preview while keeping in-app/push delivery interfaces ready.

## Security Boundary

Sensitive operations must execute server-side:

- authentication
- password changes
- health-data reads/writes
- data export
- account deletion
- notification preference mutation

## Medical Safety Boundary

The application provides tracking and general risk-oriented information only.

The insight engine must not claim to diagnose disease, replace a clinician, or guarantee future health outcomes.
