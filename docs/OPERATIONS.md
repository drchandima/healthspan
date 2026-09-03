# HealthSpan Operations

## Purpose

This document describes operational checks and common response procedures after HealthSpan has been deployed.

## Health Checks

At minimum monitor:

- application availability
- authentication availability
- API/server error rate
- response latency
- storage read/write failures
- OCR adapter failures
- email delivery failures

If Next.js health endpoints are added, document their exact paths here.

## Logs

Log:

- authentication failures without passwords
- server errors
- OCR processing failures
- email delivery failures
- repository errors
- account deletion events without exposing sensitive health data

Do not log:

- passwords
- session secrets
- full health records unnecessarily
- uploaded report contents unnecessarily
- authentication tokens

## Common Incident: Application Error

Check in this order:

1. Application process/container.
2. Recent deployment.
3. Environment variables.
4. JSON data directory permissions/storage.
5. Repository errors.
6. External OCR/email services.
7. Server resource limits.

## Common Incident: Data Not Saving

Check:

1. Data directory exists.
2. Application has write permission.
3. Disk/storage is available.
4. JSON file is valid.
5. Repository error logs.
6. Concurrent write behavior.

For production-scale use, migrate persistence to a transactional database rather than adding complexity to JSON-file locking.

## Common Incident: OCR Failure

Check:

1. Uploaded file type/size.
2. OCR provider availability.
3. Provider credentials.
4. OCR response structure.
5. Field confidence handling.

A failed OCR operation must not create partially trusted lab results.

## Common Incident: Incorrect Insight

Check:

1. Source measurements.
2. Measurement timestamps.
3. Units.
4. Reference-range configuration.
5. Trend calculation window.
6. Insight rule conditions.
7. Score calculation inputs.

Insights should always be explainable from stored evidence.

## Backup / Restore

For the MVP JSON store:

- Back up the data directory using a secure mechanism.
- Protect backups with access controls.
- Test restoration periodically.
- Do not put backup files in the public directory.

When migrating to a database, use database-native backup and recovery procedures.

## Privacy Incident

If health data may have been exposed:

1. Restrict access immediately.
2. Preserve relevant security logs.
3. Determine the affected records.
4. Rotate compromised credentials/secrets.
5. Review authorization boundaries.
6. Follow the organization's applicable privacy/security incident process.

## Operational Principle

Health data is sensitive. Operational convenience must not override authorization, privacy, auditability, or data integrity.
