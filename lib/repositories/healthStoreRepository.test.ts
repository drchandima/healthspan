import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPool, closePool } from '@/lib/db';
import { healthStoreRepository } from '@/lib/repositories/healthStoreRepository';
import { deleteUserCascade } from '@/lib/repositories/userRepository';
import { SEED_DEMO_STORE } from '@/lib/seedData';
import type { HealthSpanStore } from '@/lib/types';

const TENANT = 'tenant-test-roundtrip';
const USER = 'usr_test_roundtrip';
const EMAIL = 'test@healthspan.dev';

let pool: ReturnType<typeof getPool>;

function withUniqueIds(store: HealthSpanStore): HealthSpanStore {
  let seq = 0;
  const uid = (key: string) => `test-${key}-${seq++}`;
  const remap = <T extends { id: string }>(records: T[]): T[] =>
    records.map((r) => ({ ...r, id: uid(r.id.split('-').pop() || 'rec') }));
  return {
    ...store,
    tenantId: TENANT,
    userId: USER,
    account: { ...store.account, email: EMAIL },
    profile: { ...store.profile, fullName: 'Terra Test' },
    timeSeries: {
      ...store.timeSeries,
      bodyMetrics: remap(store.timeSeries.bodyMetrics),
      lifestyle: {
        ...store.timeSeries.lifestyle,
        sleep: remap(store.timeSeries.lifestyle.sleep),
        exercise: remap(store.timeSeries.lifestyle.exercise),
        diet: remap(store.timeSeries.lifestyle.diet),
        medications: remap(store.timeSeries.lifestyle.medications),
      },
      labResults: remap(store.timeSeries.labResults),
    },
    auditTrail: remap(store.auditTrail),
    notifications: remap(store.notifications),
  };
}

describe('healthStoreRepository (PostgreSQL round-trip)', () => {
  beforeAll(async () => {
    pool = getPool();
    await pool.query(
      `INSERT INTO tenants (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [TENANT, 'Test Tenant']
    );
    await pool.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, full_name, gender, dob)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [USER, TENANT, EMAIL, 'not-a-real-hash', 'Terra Test', 'female', '1990-08-05']
    );
  });

  afterAll(async () => {
    await deleteUserCascade(USER, TENANT);
    await pool.query(`DELETE FROM tenants WHERE id = $1`, [TENANT]);
    await closePool();
  });

  it('saves and loads the full aggregate back intact', async () => {
    const store = withUniqueIds(SEED_DEMO_STORE);
    await healthStoreRepository.save(store);

    const loaded = await healthStoreRepository.load(USER, TENANT);
    expect(loaded).not.toBeNull();
    if (!loaded) return;

    expect(loaded.userId).toBe(USER);
    expect(loaded.tenantId).toBe(TENANT);
    expect(loaded.account.email).toBe(EMAIL);
    expect(loaded.profile.fullName).toBe('Terra Test');
    expect(loaded.timeSeries.bodyMetrics.length).toBe(store.timeSeries.bodyMetrics.length);
    expect(loaded.timeSeries.labResults.length).toBe(store.timeSeries.labResults.length);
    expect(loaded.timeSeries.lifestyle.medications.length).toBe(store.timeSeries.lifestyle.medications.length);
    expect(loaded.auditTrail.length).toBe(store.auditTrail.length);
    expect(loaded.notifications.length).toBe(store.notifications.length);

    const lab = loaded.timeSeries.labResults[0];
    expect(lab).toBeDefined();
    expect(Number.isFinite(lab.value)).toBe(true);

    const med = loaded.timeSeries.lifestyle.medications[0];
    expect(med.scheduleTime).toEqual(store.timeSeries.lifestyle.medications[0].scheduleTime);
  });

  it('preserves jsonb audit previous/new values (regression: FIX-001)', async () => {
    const store = withUniqueIds(SEED_DEMO_STORE);
    store.auditTrail[0].previousValue = { weightKg: 76.0, bloodPressure: '120/80' };
    store.auditTrail[0].newValue = { testName: 'Fasting Blood Sugar', value: 114 };
    await healthStoreRepository.save(store);

    const loaded = await healthStoreRepository.load(USER, TENANT);
    expect(loaded).not.toBeNull();
    if (!loaded) return;
    const first = loaded.auditTrail.find((a) => a.id === store.auditTrail[0].id);
    expect(first).toBeDefined();
    expect(first?.previousValue).toEqual({ weightKg: 76.0, bloodPressure: '120/80' });
    expect(first?.newValue).toEqual({ testName: 'Fasting Blood Sugar', value: 114 });
  });

  it('returns null for a non-existent user', async () => {
    const result = await healthStoreRepository.load('usr_does_not_exist', TENANT);
    expect(result).toBeNull();
  });
});
