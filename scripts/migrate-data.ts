import { config as loadEnv } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import type { HealthSpanStore } from '@/lib/types';

type LegacyImportStore = HealthSpanStore & {
  account?: { passwordHash?: string };
  tenantId?: string;
};

loadEnv({ path: path.resolve(process.cwd(), '.env.local') });

const DATA_USERS_DIR = path.resolve(process.cwd(), 'data/users');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://healthspan@127.0.0.1:5433/healthspan',
});

async function upsertUser(store: LegacyImportStore): Promise<void> {
  const existing = await pool.query(
    `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [store.userId]
  );

  let passwordHash = existing.rows[0]?.password_hash;
  if (!passwordHash) {
    // Hash whatever was stored. Legacy seed used plaintext "admin123".
    const plain = store.account?.passwordHash || 'admin123';
    passwordHash = await bcrypt.hash(plain, 12);
  }

  const profile = store.profile || {};
  const bio = profile.baselineBiometrics || {};

  await pool.query(
    `INSERT INTO users
       (id, tenant_id, email, password_hash, two_factor_enabled, full_name,
        gender, dob, ethnicity, initial_height_cm, initial_weight_kg, baseline_bp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       full_name = EXCLUDED.full_name,
       gender = EXCLUDED.gender,
       dob = EXCLUDED.dob,
       ethnicity = EXCLUDED.ethnicity,
       initial_height_cm = EXCLUDED.initial_height_cm,
       initial_weight_kg = EXCLUDED.initial_weight_kg,
       baseline_bp = EXCLUDED.baseline_bp,
       updated_at = now()`,
    [
      store.userId,
      store.tenantId || 'tenant-enterprise-01',
      store.account?.email || 'admin@healthspan.com',
      passwordHash,
      store.account?.twoFactorEnabled || false,
      profile.fullName || '',
      profile.gender || 'other',
      profile.dob || '',
      profile.ethnicity || '',
      bio.initialHeightCm ?? null,
      bio.initialWeightKg ?? null,
      bio.baselineBloodPressure || '120/80',
    ]
  );

  await pool.query(
    `INSERT INTO tenants (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
    [store.tenantId || 'tenant-enterprise-01', 'Enterprise (Default)']
  );

  await pool.query(
    `INSERT INTO notification_preferences (id, tenant_id, user_id, digest_frequency, in_app, push_enabled)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id, user_id) DO UPDATE SET
       digest_frequency = EXCLUDED.digest_frequency,
       in_app = EXCLUDED.in_app,
       push_enabled = EXCLUDED.push_enabled`,
    [
      `pref-${store.userId}`,
      store.tenantId || 'tenant-enterprise-01',
      store.userId,
      store.preferences?.digestFrequency || 'weekly',
      store.preferences?.inAppNotifications !== false,
      store.preferences?.pushNotifications !== false,
    ]
  );
}

async function main() {
  if (!fs.existsSync(DATA_USERS_DIR)) {
    console.log('[migrate] No data/users directory; nothing to migrate.');
    await pool.end();
    return;
  }
  const files = fs
    .readdirSync(DATA_USERS_DIR)
    .filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('[migrate] No legacy JSON user files found.');
    await pool.end();
    return;
  }

  // Load repository lazily after env is set.
  const { healthStoreRepository } = await import(
    '@/lib/repositories/healthStoreRepository'
  );

  for (const file of files) {
    const filePath = path.join(DATA_USERS_DIR, file);
    console.log(`[migrate] Processing ${file}...`);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const store = JSON.parse(raw) as LegacyImportStore;
    if (!store || !store.userId) {
      console.warn(`[migrate] Skipping ${file}: missing userId.`);
      continue;
    }

    await upsertUser(store);
    await healthStoreRepository.save(store);
    console.log(
      `[migrate] Imported user ${store.userId}` +
        ` (${store.timeSeries?.bodyMetrics?.length ?? 0} body, ` +
        `${store.timeSeries?.labResults?.length ?? 0} lab, ` +
        `${store.auditTrail?.length ?? 0} audit)`
    );
  }

  console.log('[migrate] Done.');
  await pool.end();
}

main().catch(async (err) => {
  console.error('[migrate] Failed:', err);
  await pool.end().catch(() => {});
  process.exit(1);
});
