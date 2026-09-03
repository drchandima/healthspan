import { config as loadEnv } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

loadEnv({ path: path.resolve(process.cwd(), '.env.local') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.resolve(__dirname, '../db/schema.sql');
const DATA_USERS_DIR = path.resolve(process.cwd(), 'data/users');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://healthspan@127.0.0.1:5433/healthspan',
});

const SEED_USER_ID = 'usr_admin_01';
const SEED_TENANT_ID = 'tenant-enterprise-01';
const SEED_EMAIL = 'admin@healthspan.com';
const SEED_PASSWORD = 'admin123';

async function main() {
  console.log('[init-db] Applying schema...');
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  await pool.query(schema);

  console.log('[init-db] Ensuring default tenant...');
  await pool.query(
    `INSERT INTO tenants (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
    [SEED_TENANT_ID, 'Enterprise (Default)']
  );

  // Hash the seed password (never store plaintext).
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  console.log('[init-db] Ensuring seed admin account...');
  await pool.query(
    `INSERT INTO users (id, tenant_id, email, password_hash, full_name, gender, dob)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tenant_id, email) DO NOTHING`,
    [SEED_USER_ID, SEED_TENANT_ID, SEED_EMAIL, passwordHash, 'Alexander Wright, M.D.', 'male', '1982-04-15']
  );

  await pool.query(
    `INSERT INTO notification_preferences (id, tenant_id, user_id)
     VALUES ($1, $2, $3) ON CONFLICT (tenant_id, user_id) DO NOTHING`,
    [`pref-${SEED_USER_ID}`, SEED_TENANT_ID, SEED_USER_ID]
  );

  // Check for legacy JSON user files that can be migrated.
  if (fs.existsSync(DATA_USERS_DIR)) {
    const files = fs.readdirSync(DATA_USERS_DIR).filter(f => f.endsWith('.json'));
    if (files.length > 0) {
      console.log(
        `[init-db] Found ${files.length} legacy JSON user file(s). Run \`npm run db:migrate\` to import them.`
      );
    }
  }

  console.log('[init-db] Done.');
  console.log(`[init-db] Seed account ready: ${SEED_EMAIL} / (hashed)`);
  await pool.end();
}

main().catch(async (err) => {
  console.error('[init-db] Failed:', err);
  await pool.end().catch(() => {});
  process.exit(1);
});
