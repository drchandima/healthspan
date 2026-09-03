# HealthSpan AI Development Instructions

## Purpose

HealthSpan is a clean internal health-record tracking and risk-analysis web application built with Next.js. These instructions define how an AI coding agent should work in this repository.

## Source of Truth

Before making changes:

1. Read `docs/PROJECT.md`.
2. Read `docs/ARCHITECTURE.md`.
3. Read `docs/DEVELOPMENT.md`.
4. Read `docs/CURRENT.md`.
5. Read `docs/TASKS.md`.
6. Check `docs/DECISIONS.md` for relevant prior decisions.
7. Check `docs/KNOWN_ISSUES.md` before introducing a workaround.

After making changes:

1. Run the relevant tests and checks.
2. Update `docs/TASKS.md`.
3. Update `docs/CURRENT.md`.
4. Record important architectural/technical decisions in `docs/DECISIONS.md`.
5. Record reusable fixes in `docs/FIXES.md`.
6. Record unresolved problems in `docs/KNOWN_ISSUES.md`.

## Product Boundaries

- This is an MVP/internal application.
- Current persistence is PostgreSQL, kept tenant-ready for a future database-backed multi-tenant implementation.
- The persistence layer must remain tenant-ready.
- Manual data entry is required.
- OCR upload/review is required for lab reports (server-side LLM extraction behind `lib/ocr`, with a review/confirm step).
- Health insights are decision-support content, not medical diagnosis.
- Never state or imply that HealthSpan can diagnose a disease.
- Doctor-consult callouts must be used for clinically concerning or critical findings.

## Security

- The supplied `admin@healthspan.com` / `admin123` credentials are test-only seed credentials.
- Never expose test credentials in production documentation, UI, logs, or client-side source.
- Passwords must never be stored in plaintext.
- Do not put secrets in source control.
- Validate all server-side inputs.
- Enforce authorization on server-side data access.
- Account deletion must permanently remove the user's HealthSpan data.
- Data export must only export data belonging to the authenticated user.

## Data Rules

- Health records are time-series records and must contain an explicit measurement timestamp.
- Store timestamps in a consistent machine-readable representation and render them in the user's local display format.
- Preserve original measurement values and units.
- Do not silently change historical measurements.
- Historical edits/deletions require an audit trail.
- Reference ranges must retain enough metadata to explain the range and unit used at the time of evaluation.
- Include `tenantId` in the domain model even though the MVP uses a single tenant/account.

## Architecture Rules

- Prefer the Next.js App Router and TypeScript.
- Keep UI components separate from domain/business logic.
- Keep persistence behind repository/service interfaces.
- Do not make UI components directly manipulate JSON files.
- Do not couple the health-score algorithm to chart components.
- Do not hard-code reference ranges throughout the UI.
- Use shared domain types/schemas for health metrics.
- Use server-side authorization for mutations and sensitive reads.
- Prefer small, focused modules.

## Health Insight Rules

- Use deterministic, explainable rules for the MVP.
- Every insight should have a reason based on recorded measurements.
- Distinguish abnormal measurement detection from trend/risk interpretation.
- Avoid deterministic disease claims such as "you will develop diabetes."
- Prefer language such as "the current pattern may indicate increased risk; consider discussing it with a qualified healthcare professional."
- Clearly distinguish general lifestyle guidance from medical advice.
- Do not invent missing measurements.
- Do not calculate a trend from an insufficient number of observations without marking it as insufficient data.

## Definition of Done

A task is complete only when:

- Implementation matches the architecture.
- Validation/error states are handled.
- Relevant tests pass.
- Accessibility is considered.
- Sensitive data is not leaked.
- Documentation/state files are updated.
