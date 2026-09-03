# HealthSpan Project

## Product

HealthSpan is a clean internal web application for tracking personal health records as time-series data and generating explainable health trends, scores, and risk-oriented insights.

## MVP Goal

Deliver a usable single-account application that can:

- Authenticate the test user.
- Record and review health data over time.
- Visualize body metrics, lifestyle data, and laboratory results.
- Detect abnormal values using configured reference ranges.
- Analyze simple trends and percentage changes.
- Calculate an explainable overall Health Score.
- Generate plain-language, non-diagnostic health insights.
- Upload laboratory reports for OCR extraction and human review.
- Send configurable weekly/monthly email digests.
- Export or permanently delete the account and its data.

## Primary User

MVP users:

- Email: `admin@healthspan.com`
- Password: `admin123`
- Email: `demo@healthspan.com`
- Password: `demo123`

These credentials are development/test fixtures only and must not be treated as production credentials.

## Technology Direction

- Next.js
- TypeScript
- React
- Next.js App Router
- Server-side API/actions for protected operations
- PostgreSQL persistence (tenant-ready via `tenantId`/`userId`)
- iron-session + bcryptjs authentication
- LLM-powered OCR adapter for laboratory report extraction (OpenAI-compatible, server-side)
- Repository/service abstraction
- Responsive web UI
- Time-series charts
- Email digest adapter
- In-app notification infrastructure
- Push-notification infrastructure placeholder

## Core Domains

1. Authentication & Account Management
2. User Profile
3. Body Metrics
4. Lifestyle Tracking
5. Lab Results
6. Health Score
7. Health Insights
8. Notifications
9. Settings
10. Audit History

## Health Data

### Profile

- Name
- Gender
- Date of birth
- Biometrics at account creation
- Ethnicity

### Body Metrics

- Weight
- Height
- Waist circumference
- BMI
- Blood pressure: systolic and diastolic

### Lifestyle

- Sleep duration
- Exercise type and duration
- Diet and meal calories
- Daily calorie target
- Alcohol use
- Smoking
- Medications
- Medication schedule and due alerts

### Laboratory Results

- Hemoglobin
- Blood sugar
- Total cholesterol
- Serum creatinine (S/Cr)
- AST
- ALT

## Data Principle

Every measurement is a time-series event with:

- `tenantId`
- `userId`
- metric type
- value(s)
- unit
- measuredAt
- createdAt
- updatedAt
- source
- status/flags where applicable

## MVP Constraints

- Single test account.
- Manual data entry is the primary input method.
- PostgreSQL persistence.
- No full multi-tenant administration UI.
- No autonomous diagnosis.
- No clinical decision-making beyond explainable threshold/trend rules.
- OCR extraction must have a review/confirmation step when confidence is low.
- OCR extraction is a candidate until the user confirms it; extraction is validated and confidence-scored server-side.

## Success Criteria

A user can log into HealthSpan, enter health data, see it plotted over time, understand whether values are within configured ranges, receive explainable insights, review OCR-extracted lab results, control digest notifications, export data, and permanently delete the account.
