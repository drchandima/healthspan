import dotenv from 'dotenv';
import path from 'node:path';

/**
 * Loads .env.local for tests so repository round-trip tests connect to the
 * same PostgreSQL instance as the app (Docker `healthspan-db`, port 5433).
 * Without this the `lib/db.ts` passwordless fallback URL hits the Docker DB
 * and fails SCRAM auth.
 *
 * The LLM provider key is intentionally unset afterwards: the unit tests are
 * written against a keyless environment (providers that need a key set it
 * explicitly), so a developer's real `.env.local` key must not leak the real
 * provider path into tests.
 */
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

delete process.env.LLM_PROVIDER_API_KEY;
delete process.env.LLM_PROVIDER_BASE_URL;
delete process.env.LLM_MODEL;
delete process.env.SESSION_SECRET;