import { Pool } from 'pg';

/**
 * Shared PostgreSQL connection pool.
 * Loaded lazily from DATABASE_URL so scripts and the app share one source.
 */
const globalForPg = globalThis as unknown as { healthspanPool?: Pool };

function createPool(): Pool {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://healthspan@127.0.0.1:5433/healthspan';
  return new Pool({
    connectionString,
    // Fail fast if the DB is unavailable during startup.
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
  });
}

export function getPool(): Pool {
  if (!globalForPg.healthspanPool) {
    globalForPg.healthspanPool = createPool();
  }
  return globalForPg.healthspanPool;
}

export async function closePool(): Promise<void> {
  if (globalForPg.healthspanPool) {
    await globalForPg.healthspanPool.end();
    globalForPg.healthspanPool = undefined;
  }
}
