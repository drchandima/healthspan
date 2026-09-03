import { getPool } from '@/lib/db';
import { UserAccount, UserProfile } from '@/lib/types';

export interface UserRow {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  twoFactorEnabled: boolean;
  fullName: string;
  gender: string;
  dob: string;
  ethnicity: string;
  initialHeightCm: number | null;
  initialWeightKg: number | null;
  baselineBp: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  deletedAt: string | null;
}

const DEFAULT_TENANT_ID = 'tenant-enterprise-01';

export function accountFromRows(row: UserRow): UserAccount {
  return {
    email: row.email,
    passwordHash: row.passwordHash,
    twoFactorEnabled: row.twoFactorEnabled,
    createdAt: row.createdAt,
    lastLoginAt: row.lastLoginAt || '',
  };
}

export function profileFromRows(row: UserRow): UserProfile {
  return {
    fullName: row.fullName,
    dob: row.dob,
    gender: (row.gender as UserProfile['gender']) || 'other',
    ethnicity: row.ethnicity,
    baselineBiometrics: {
      initialHeightCm: row.initialHeightCm ?? 178,
      initialWeightKg: row.initialWeightKg ?? 76,
      baselineBloodPressure: row.baselineBp || '120/80',
    },
  };
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await getPool().query(
    `SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
    [email]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const result = await getPool().query(
    `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [id]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function createUser(input: {
  id: string;
  tenantId?: string;
  email: string;
  passwordHash: string;
  fullName: string;
}): Promise<UserRow> {
  const tenantId = input.tenantId || DEFAULT_TENANT_ID;
  await getPool().query(
    `INSERT INTO tenants (id, name) VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [tenantId, 'Enterprise (Default)']
  );
  await getPool().query(
    `INSERT INTO users (id, tenant_id, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.id, tenantId, input.email, input.passwordHash, input.fullName]
  );
  await getPool().query(
    `INSERT INTO notification_preferences (id, tenant_id, user_id)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [`pref-${input.id}`, tenantId, input.id]
  );
  const user = await findUserById(input.id);
  if (!user) throw new Error('Failed to create user');
  return user;
}

export async function updateLastLogin(id: string): Promise<void> {
  await getPool().query(
    `UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = $1`,
    [id]
  );
}

export async function updatePassword(
  id: string,
  newPasswordHash: string
): Promise<void> {
  await getPool().query(
    `UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`,
    [newPasswordHash, id]
  );
}

export async function updateUserProfile(
  id: string,
  profile: UserProfile
): Promise<void> {
  await getPool().query(
    `UPDATE users SET
       full_name = $1, gender = $2, dob = $3, ethnicity = $4,
       initial_height_cm = $5, initial_weight_kg = $6, baseline_bp = $7,
       updated_at = now()
     WHERE id = $8`,
    [
      profile.fullName,
      profile.gender,
      profile.dob,
      profile.ethnicity,
      profile.baselineBiometrics.initialHeightCm,
      profile.baselineBiometrics.initialWeightKg,
      profile.baselineBiometrics.baselineBloodPressure,
      id,
    ]
  );
}

export async function setTwoFactorEnabled(
  id: string,
  enabled: boolean
): Promise<void> {
  await getPool().query(
    `UPDATE users SET two_factor_enabled = $1, updated_at = now() WHERE id = $2`,
    [enabled, id]
  );
}

/**
 * Permanently delete a user and all owned data.
 */
export async function deleteUserCascade(userId: string, tenantId: string): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Delete owned health data + audit + notifications + prefs, then user.

    // The tenant FK is ON DELETE CASCADE; but we delete the user's rows,
    // not the tenant. Delete user-owned rows explicitly so that the tenant
    // record can be retained for other users.
    await client.query(`DELETE FROM body_metrics WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await client.query(`DELETE FROM sleep_records WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await client.query(`DELETE FROM exercise_records WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await client.query(`DELETE FROM diet_records WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await client.query(`DELETE FROM medications WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await client.query(`DELETE FROM lab_results WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await client.query(`DELETE FROM audit_events WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await client.query(`DELETE FROM notifications WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await client.query(`DELETE FROM notification_preferences WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function mapRow(row: Record<string, unknown>): UserRow {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    twoFactorEnabled: row.two_factor_enabled != null ? Boolean(row.two_factor_enabled) : false,
    fullName: row.full_name as string,
    gender: (row.gender as string) || '',
    dob: (row.dob as string) || '',
    ethnicity: (row.ethnicity as string) || '',
    initialHeightCm: row.initial_height_cm == null ? null : Number(row.initial_height_cm),
    initialWeightKg: row.initial_weight_kg == null ? null : Number(row.initial_weight_kg),
    baselineBp: (row.baseline_bp as string) || '120/80',
    createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : '',
    updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString() : '',
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at as string).toISOString() : null,
    deletedAt: row.deleted_at ? new Date(row.deleted_at as string).toISOString() : null,
  };
}
