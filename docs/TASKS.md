# HealthSpan Tasks

> This file is the high-level index. Detailed plans live in `plans/TASK-*.md`.
> - TASK-001 — Authentication + PostgreSQL: COMPLETE
> - TASK-002 — LLM OCR for Lab Reports: COMPLETE (see `plans/TASK-002-llm-ocr.md`)

## Phase 0 — Project Foundation

- [x] Initialize Next.js App Router project with TypeScript.
- [x] Configure linting, formatting, testing, and strict TypeScript.
- [x] Create feature/domain directory structure.
- [x] Create environment configuration and `.env.example`.
- [x] Create server-only data directory configuration.
- [x] Add shared validation and error-handling utilities (`lib/http.ts`, `lib/validation`).
- [x] Add the persistent medical disclaimer component.

## Phase 1 — Authentication & Account

> Implemented with iron-session + bcryptjs against PostgreSQL. Passwords stored only as bcrypt hashes.

- [x] Implement test account fixture for `admin@healthspan.com`.
- [x] Implement secure password hashing for the fixture account.
- [x] Implement login.
- [x] Implement session management.
- [x] Protect authenticated routes.
- [x] Implement logout.
- [x] Implement password change.
- [x] Add account deletion authorization/confirmation flow.
- [x] Ensure deletion removes account-owned data.
- [x] Add authentication tests (pure unit tests in `lib/__tests__/`; see `npm test`).

## Phase 2 — Tenant-Ready Persistence (PostgreSQL)

> Persistence migrated from JSON-file storage to a project-local PostgreSQL 18 cluster (`.pgdata/`, port 5433, gitignored). Repositories are `lib/repositories/healthStoreRepository.ts` and `lib/repositories/userRepository.ts`.

- [x] Define shared IDs and timestamp types.
- [x] Define `tenantId` and `userId` ownership model.
- [x] Create repository interfaces.
- [x] Implement PostgreSQL repository (`healthStoreRepository`, `userRepository`).
- [x] Implement safe server-side reads/writes (parameterized queries, transactions).
- [x] Add initial data via `scripts/init-db.ts`, `scripts/migrate-data.ts`.
- [x] Add demo seed (`scripts/seed-demo.ts`, `npm run db:seed`).
- [x] Add audit-event repository.
- [x] Add repository tests (PostgreSQL round-trip + jsonb regression, `healthStoreRepository.test.ts`).

## Phase 3 — User Profile

- [ ] Create profile model.
- [ ] Add name, gender, DOB, ethnicity.
- [ ] Add account-creation biometrics.
- [ ] Add profile page.
- [ ] Add profile edit validation.
- [ ] Add profile audit events.

## Phase 4 — Body Metrics

- [ ] Define metric configuration model.
- [ ] Implement weight.
- [ ] Implement height.
- [ ] Implement waist circumference.
- [ ] Implement BMI calculation.
- [ ] Implement blood pressure with systolic/diastolic values.
- [ ] Implement time-series log form.
- [ ] Implement metric cards.
- [ ] Implement metric selection.
- [ ] Implement time-series charts.
- [ ] Add normal/reference-range bands.
- [ ] Highlight out-of-range points.
- [ ] Implement historical edit.
- [ ] Implement historical delete.
- [ ] Implement audit trail display.
- [ ] Add body-metric tests.

## Phase 5 — Dashboard

- [ ] Build dashboard shell.
- [ ] Display user summary.
- [ ] Display body-metric summary.
- [ ] Display lifestyle summary.
- [ ] Display lab summary.
- [ ] Display top five insights.
- [ ] Display overall Health Score.
- [ ] Display score component breakdown.
- [ ] Display Health Score trend.
- [ ] Add responsive layout.
- [ ] Add loading/empty/error states.

## Phase 6 — Lifestyle Tracking

### Sleep

- [ ] Add sleep duration model.
- [ ] Add sleep log form.
- [ ] Add recent entries.
- [ ] Add time-series chart.

### Exercise

- [ ] Add exercise type.
- [ ] Add exercise duration.
- [ ] Add exercise log form.
- [ ] Add recent entries.
- [ ] Add trend visualization.

### Diet

- [ ] Define daily calorie target inputs.
- [ ] Implement transparent calorie-target calculation.
- [ ] Add breakfast/lunch/dinner entries.
- [ ] Add calorie counts.
- [ ] Add daily summary.
- [ ] Add recent entries.

### Alcohol and Smoking

- [ ] Add alcohol-use tracking.
- [ ] Add smoking-status tracking.
- [ ] Add recent entries.
- [ ] Add trend support.

### Medications

- [ ] Add medication model.
- [ ] Link medication to illness/condition label.
- [ ] Add medication schedule.
- [ ] Add due medication alerts.
- [ ] Add recent entries.
- [ ] Add medication form.
- [ ] Add edit/delete audit trail.

## Phase 7 — Laboratory Results

- [ ] Define lab metric configuration.
- [ ] Implement Hemoglobin.
- [ ] Implement Blood Sugar.
- [ ] Implement Total Cholesterol.
- [ ] Implement S/Cr.
- [ ] Implement AST.
- [ ] Implement ALT.
- [ ] Add unit/panel selectors.
- [ ] Add sortable date-grouped results table.
- [ ] Add status badges.
- [ ] Add reference ranges.
- [ ] Add manual entry form.
- [x] Add lab report upload (real file upload + authenticated server-side processing).
- [x] Fix pdf.js worker under Turbopack (`?url` asset — FIX-001, KI-002).
- [x] Add OCR adapter interface (`lib/ocr/provider.ts` abstraction).
- [x] Add OCR extraction result model (validation + confidence staging).
- [x] Add confidence percentages (per-field, `<85%` = low confidence).
- [x] Highlight low-confidence fields in amber (editable review step).
- [x] Add editable review/confirm step (`OcrUploadModal`).
- [x] Persist only confirmed results.
- [ ] Add duplicate-report detection.
- [ ] Add lab audit trail.

## Phase 8 — Health Evaluation

- [ ] Implement reference-range evaluator.
- [ ] Implement severity classification.
- [ ] Implement percentage-change calculations.
- [ ] Implement trend detection.
- [ ] Define Health Score components.
- [ ] Implement deterministic Health Score calculation.
- [ ] Expose score contribution breakdown.
- [ ] Persist score snapshots or make reproducible historical calculations.
- [ ] Add score trend chart.
- [ ] Add tests for score calculation.

## Phase 9 — Health Insights Engine

- [ ] Define structured insight model.
- [ ] Implement abnormal-value insight rules.
- [ ] Implement trend insight rules.
- [ ] Implement cross-metric pattern rules.
- [ ] Implement severity levels: info/warning/critical.
- [ ] Add plain-language findings.
- [ ] Add lifestyle suggestions.
- [ ] Add doctor-consult callouts.
- [ ] Implement insufficient-data handling.
- [ ] Add persistent medical disclaimer.
- [ ] Test every rule with positive/negative/boundary cases.

## Phase 10 — Notifications

- [ ] Define notification preferences.
- [ ] Implement weekly digest setting.
- [ ] Implement monthly digest setting.
- [ ] Implement off setting.
- [ ] Add live email preview.
- [ ] Generate Health Score summary.
- [ ] Include new insights.
- [ ] Include missing-data reminders.
- [ ] Add unsubscribe/frequency adjustment.
- [ ] Add email adapter interface.
- [ ] Add in-app notification interface.
- [ ] Add push notification interface.
- [ ] Add notification tests.

## Phase 11 — Settings

- [ ] Profile editing.
- [ ] Password change.
- [ ] 2FA readiness/prompt UI.
- [ ] Data export as JSON.
- [ ] Data export as CSV where applicable.
- [ ] Encryption/privacy information.
- [ ] Account deletion UI.
- [ ] DELETE confirmation gate.
- [ ] Verify permanent deletion.
- [ ] Verify deleted account cannot log in.

## Phase 12 — Hardening

- [ ] Validate all server inputs.
- [ ] Review authorization on every protected data operation.
- [ ] Review sensitive logging.
- [ ] Review XSS/CSRF/session protections.
- [ ] Add accessibility checks.
- [ ] Add responsive UI checks.
- [ ] Add error/empty/loading states.
- [ ] Add integration tests.
- [ ] Add end-to-end smoke tests.
- [ ] Perform data-export/deletion verification.
- [ ] Review medical wording and disclaimer placement.

## Definition of Done

A feature is complete when:

- The UI works.
- Server-side validation exists.
- Ownership/authorization is enforced.
- Relevant audit events exist where required.
- Tests cover normal and boundary cases.
- Loading/error/empty states are handled.
- Documentation/state files are updated.
