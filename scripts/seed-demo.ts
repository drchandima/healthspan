import { config as loadEnv } from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { SEED_DEMO_STORE } from '@/lib/seedData';
import type { HealthSpanStore } from '@/lib/types';

loadEnv({ path: process.env.PWD + '/.env.local' });

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://healthspan@127.0.0.1:5433/healthspan',
});

const DEMO_USER_ID = 'usr_demo_01';
const DEMO_TENANT_ID = 'tenant-enterprise-01';
const DEMO_EMAIL = 'demo@healthspan.com';
const DEMO_PASSWORD = 'demo123';

async function main() {
  console.log('[seed-demo] Ensuring default tenant...');
  await pool.query(
    `INSERT INTO tenants (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
    [DEMO_TENANT_ID, 'Enterprise (Default)']
  );

  // Idempotent reset: wipe any prior demo user + store so a partial/failed run
  // never leaves inconsistent data behind.
  const { deleteUserCascade } = await import('@/lib/repositories/userRepository');
  await deleteUserCascade(DEMO_USER_ID, DEMO_TENANT_ID);

  console.log('[seed-demo] Creating demo account...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await pool.query(
    `INSERT INTO users (id, tenant_id, email, password_hash, full_name, gender, dob)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [DEMO_USER_ID, DEMO_TENANT_ID, DEMO_EMAIL, passwordHash, 'Demo Patient', 'female', '1990-08-05']
  );

  await pool.query(
    `INSERT INTO notification_preferences (id, tenant_id, user_id)
     VALUES ($1, $2, $3) ON CONFLICT (tenant_id, user_id) DO NOTHING`,
    [`pref-${DEMO_USER_ID}`, DEMO_TENANT_ID, DEMO_USER_ID]
  );

  console.log('[seed-demo] Persisting demo health store...');
  const { healthStoreRepository } = await import('@/lib/repositories/healthStoreRepository');

  // IDs in SEED_DEMO_STORE are global primary keys that may already be taken by
  // the migrated admin data, so remap them to fresh demo-scoped IDs.
  let seq = 0;
  const uid = (key: string) => `demo-${key}-${seq++}`;
  const remap = <T extends { id: string }>(records: T[]): T[] =>
    records.map((r) => ({ ...r, id: uid(r.id.split('-').pop() || 'rec') }));

  const store: HealthSpanStore = {
    ...SEED_DEMO_STORE,
    tenantId: DEMO_TENANT_ID,
    userId: DEMO_USER_ID,
    account: {
      email: DEMO_EMAIL,
      passwordHash,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: '',
    },
    profile: {
      fullName: 'Demo Patient',
      dob: '1990-08-05',
      gender: 'female',
      ethnicity: 'South Asian',
      baselineBiometrics: {
        initialHeightCm: 165,
        initialWeightKg: 65.0,
        baselineBloodPressure: '118/76',
      },
    },
    timeSeries: {
      ...SEED_DEMO_STORE.timeSeries,
      bodyMetrics: remap(SEED_DEMO_STORE.timeSeries.bodyMetrics),
      lifestyle: {
        ...SEED_DEMO_STORE.timeSeries.lifestyle,
        sleep: remap(SEED_DEMO_STORE.timeSeries.lifestyle.sleep),
        exercise: remap(SEED_DEMO_STORE.timeSeries.lifestyle.exercise),
        diet: remap(SEED_DEMO_STORE.timeSeries.lifestyle.diet),
        medications: remap(SEED_DEMO_STORE.timeSeries.lifestyle.medications),
      },
      labResults: remap(SEED_DEMO_STORE.timeSeries.labResults),
    },
    auditTrail: remap(seedAudit()),
    notifications: remap(seedNotifications()),
  };

  await healthStoreRepository.save(store);
  console.log('[seed-demo] Done.');
  console.log(`[seed-demo] Demo account ready: ${DEMO_EMAIL} / (hashed)`);
  await pool.end();
}

function seedAudit() {
  return [
    {
      id: 'aud-seed-1',
      timestamp: new Date().toISOString(),
      action: 'CREATE' as const,
      entityType: 'profile' as const,
      recordId: DEMO_USER_ID,
      summary: 'Demo account seeded',
      reason: 'Seed script',
    },
  ];
}

function seedNotifications() {
  return [
    {
      id: 'notif-seed-1',
      timestamp: new Date().toISOString(),
      title: 'Welcome to HealthSpan',
      message: 'Your demo health records have been created.',
      type: 'info' as const,
      read: false,
      actionLink: undefined,
    },
  ];
}

main().catch(async (err) => {
  console.error('[seed-demo] Failed:', err);
  await pool.end().catch(() => {});
  process.exit(1);
});
