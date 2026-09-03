# HealthSpan Development

## Prerequisites

- Node.js LTS compatible with the selected Next.js version
- npm, pnpm, or yarn
- Git

Use one package manager consistently within the repository.

## Local Setup

```bash
git clone <repository>
cd healthspan
npm install
```

Create local environment configuration from the project's example environment file.

Never commit secrets.

## Development Commands

```bash
npm run dev
```

Build:

```bash
npm run build
```

Run production build locally:

```bash
npm run start
```

Lint:

```bash
npm run lint
```

Test:

```bash
npm test
```

If a different test command is selected, document it in the repository package scripts.

## Database

Persistence is PostgreSQL (project-local cluster in a gitignored `.pgdata/`, port 5433).
Initialize and seed via:

```bash
npm run db:init      # apply db/schema.sql idempotently + seed tenant/admin
npm run db:migrate   # import legacy JSON user files (if any)
npm run db:seed      # seed demo@healthspan.com / demo123 + sample data
```

`db/schema.sql` is the schema source of truth and includes idempotent
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` upgrades, so re-running `db:init` is safe.

Do not expose any data directory through the Next.js public/static asset path.

## OCR Configuration

OCR extraction runs server-side. Configure the optional LLM provider in `.env.local`:

```text
LLM_PROVIDER_BASE_URL=https://api.openai.com/v1
LLM_PROVIDER_API_KEY=
LLM_MODEL=gpt-4o-mini
```

When `LLM_PROVIDER_API_KEY` is empty, `/api/ocr-scan` returns a deterministic fallback
(labelled `fallback: true`) for development/demo — it is not genuine OCR.

## Environment Variables

Examples:

```text
APP_URL=
SESSION_SECRET=
DATABASE_URL=
LLM_PROVIDER_BASE_URL=
LLM_PROVIDER_API_KEY=
LLM_MODEL=
```

## Coding Conventions

### TypeScript

- Enable strict TypeScript.
- Prefer explicit domain types.
- Avoid `any`.
- Validate external input at boundaries.
- Keep domain calculations deterministic and testable.

### React / Next.js

- Prefer Server Components by default.
- Use Client Components only when browser interactivity is required.
- Keep data fetching and mutations behind server-side boundaries.
- Do not place secrets in client components.
- Keep charts/forms interactive but domain-agnostic.

### Components

Prefer:

```text
Feature component
  -> domain service
  -> repository
```

rather than:

```text
Component
  -> database / files directly
```

UI components must go through the repository/service layer; they must never read/write
the database or JSON files directly.

### Forms

Every form should support:

- validation
- loading state
- success state
- error state
- accessible labels
- keyboard navigation

## Date/Time Rules

- Persist timestamps in ISO 8601 form.
- Keep `measuredAt` separate from `createdAt`.
- Do not infer a measurement timestamp from file upload time when the report contains an explicit test date.
- Display dates/times according to the application's selected/local timezone convention.

## Units

The MVP should use standard metric units where applicable:

- kg
- cm
- mmHg
- mg/dL or another explicitly configured laboratory unit

Do not silently convert units without recording the conversion.

## Testing Strategy

### Unit Tests

Cover:

- BMI calculation
- reference-range evaluation
- abnormality severity
- percentage-change calculation
- trend detection
- Health Score calculation
- insight rules
- calorie-target calculation
- notification scheduling logic
- OCR validation (`lib/ocr/validation.ts`)
- OCR confidence (`lib/ocr/confidence.ts`)
- OCR provider fallback path (`lib/ocr/provider.ts`)

### Integration Tests

Cover:

- authentication
- repository operations
- audit trail
- account deletion
- export
- OCR review/confirmation flow
- protected data access

### UI Tests

Cover:

- login
- metric logging
- editing/deleting a record
- lab review
- settings/account deletion confirmation
- notification preference changes

## Development Workflow

1. Select one task from `TASKS.md`.
2. Read relevant architecture and decisions.
3. Update `CURRENT.md`.
4. Implement the smallest coherent change.
5. Test it.
6. Update task/state documentation.
7. Record decisions or fixes where needed.

## Do Not

- Store health data in browser localStorage as the source of truth.
- Expose JSON data files publicly.
- Hard-code passwords in production code.
- Put health business rules directly into chart components.
- Automatically accept low-confidence OCR data.
- Make diagnostic claims.
