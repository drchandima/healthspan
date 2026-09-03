import { PoolClient } from 'pg';
import { getPool } from '@/lib/db';import {
  HealthSpanStore,
  BodyMetricRecord,
  SleepRecord,
  ExerciseRecord,
  DietRecord,
  MedicationRecord,
  LabResultRecord,
  AuditTrailRecord,
  InAppNotification,
  NotificationPreferences,
} from '@/lib/types';

type DBRow = { [key: string]: unknown };

function str(v: unknown): string | undefined {
  return v == null ? undefined : String(v);
}
function optNumber(v: unknown): number | undefined {
  return v == null ? undefined : Number(v);
}
function jsonParse(v: unknown): unknown {
  if (v == null) return undefined;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return undefined;
  }
}

/**
 * Persists the full HealthSpanStore aggregate to PostgreSQL.
 * The MVP uses a single document-style save for simplicity while keeping
 * normalized, queryable tables for each time-series domain.
 */
export class HealthStoreRepository {
  async load(userId: string, tenantId: string): Promise<HealthSpanStore | null> {
    const pool = getPool();
    const user = await pool.query(
      `SELECT * FROM users WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`,
      [userId, tenantId]
    );
    if (user.rows.length === 0) return null;
    const u = user.rows[0];

    const [body, sleep, exercise, diet, meds, labs, audit, pref, notifs] =
      await Promise.all([
        pool.query(
          `SELECT * FROM body_metrics WHERE user_id = $1 AND tenant_id = $2 ORDER BY measured_at`,
          [userId, tenantId]
        ),
        pool.query(
          `SELECT * FROM sleep_records WHERE user_id = $1 AND tenant_id = $2 ORDER BY measured_at`,
          [userId, tenantId]
        ),
        pool.query(
          `SELECT * FROM exercise_records WHERE user_id = $1 AND tenant_id = $2 ORDER BY measured_at`,
          [userId, tenantId]
        ),
        pool.query(
          `SELECT * FROM diet_records WHERE user_id = $1 AND tenant_id = $2 ORDER BY measured_at`,
          [userId, tenantId]
        ),
        pool.query(
          `SELECT * FROM medications WHERE user_id = $1 AND tenant_id = $2 ORDER BY created_at`,
          [userId, tenantId]
        ),
        pool.query(
          `SELECT * FROM lab_results WHERE user_id = $1 AND tenant_id = $2 ORDER BY measured_at, created_at`,
          [userId, tenantId]
        ),
        pool.query(
          `SELECT * FROM audit_events WHERE user_id = $1 AND tenant_id = $2 ORDER BY created_at`,
          [userId, tenantId]
        ),
        pool.query(
          `SELECT * FROM notification_preferences WHERE user_id = $1 AND tenant_id = $2 LIMIT 1`,
          [userId, tenantId]
        ),
        pool.query(
          `SELECT * FROM notifications WHERE user_id = $1 AND tenant_id = $2 ORDER BY timestamp`,
          [userId, tenantId]
        ),
      ]);

    return {
      version: '1.0.0',
      tenantId,
      userId,
      account: {
        email: u.email,
        passwordHash: '', // never exposed to client
        twoFactorEnabled: u.two_factor_enabled,
        createdAt: u.created_at ? new Date(u.created_at).toISOString() : '',
        lastLoginAt: u.last_login_at ? new Date(u.last_login_at).toISOString() : '',
      },
      profile: {
        fullName: u.full_name,
        dob: u.dob,
        gender: u.gender,
        ethnicity: u.ethnicity,
        baselineBiometrics: {
          initialHeightCm: u.initial_height_cm == null ? 178 : Number(u.initial_height_cm),
          initialWeightKg: u.initial_weight_kg == null ? 76 : Number(u.initial_weight_kg),
          baselineBloodPressure: u.baseline_bp || '120/80',
        },
      },
      timeSeries: {
        bodyMetrics: body.rows.map((r) => mapBody(r)),
        lifestyle: {
          sleep: sleep.rows.map((r) => mapSleep(r)),
          exercise: exercise.rows.map((r) => mapExercise(r)),
          diet: diet.rows.map((r) => mapDiet(r)),
          medications: meds.rows.map((r) => mapMedication(r)),
        },
        labResults: labs.rows.map((r) => mapLab(r)),
      },
      auditTrail: audit.rows.map((r) => mapAudit(r)),
      preferences: pref.rows[0]
        ? {
            digestFrequency: pref.rows[0].digest_frequency,
            inAppNotifications: pref.rows[0].in_app,
            pushNotifications: pref.rows[0].push_enabled,
          }
        : { digestFrequency: 'weekly', inAppNotifications: true, pushNotifications: true },
      notifications: notifs.rows.map((r) => mapNotification(r)),
    };
  }

  /**
   * Rewrites the user's aggregate in a single transaction.
   */
  async save(store: HealthSpanStore): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();
    const { userId, tenantId } = store;
    try {
      await client.query('BEGIN');
      await upsertProfile(client, store);
      await client.query(
        `DELETE FROM body_metrics WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );
      await client.query(
        `DELETE FROM sleep_records WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );
      await client.query(
        `DELETE FROM exercise_records WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );
      await client.query(
        `DELETE FROM diet_records WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );
      await client.query(
        `DELETE FROM medications WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );
      await client.query(
        `DELETE FROM lab_results WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );
      await client.query(
        `DELETE FROM audit_events WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );
      await client.query(
        `DELETE FROM notifications WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );
      await upsertPreferences(client, store);

      for (const m of store.timeSeries.bodyMetrics) {
        await client.query(
          `INSERT INTO body_metrics
             (id, tenant_id, user_id, measured_at, weight_kg, height_cm, bmi,
              waist_cm, bp_systolic, bp_diastolic, heart_rate_bpm, notes, status, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [
            m.id, tenantId, userId, m.timestamp,
            m.weightKg ?? null, m.heightCm ?? null, m.bmi ?? null,
            m.waistCircumferenceCm ?? null,
            m.bloodPressure?.systolic ?? null, m.bloodPressure?.diastolic ?? null,
            m.heartRateBpm ?? null, m.notes ?? null, m.status, 'manual',
          ]
        );
      }
      for (const s of store.timeSeries.lifestyle.sleep) {
        await client.query(
          `INSERT INTO sleep_records
             (id, tenant_id, user_id, measured_at, duration_hours, quality_score, bedtime, wake_time, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [s.id, tenantId, userId, s.timestamp, s.durationHours, s.qualityScore ?? null, s.bedtime ?? null, s.wakeTime ?? null, s.notes ?? null]
        );
      }
      for (const e of store.timeSeries.lifestyle.exercise) {
        await client.query(
          `INSERT INTO exercise_records
             (id, tenant_id, user_id, measured_at, activity_type, duration_minutes, intensity, calories_burned, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [e.id, tenantId, userId, e.timestamp, e.activityType, e.durationMinutes, e.intensity, e.caloriesBurned ?? null, e.notes ?? null]
        );
      }
      for (const d of store.timeSeries.lifestyle.diet) {
        await client.query(
          `INSERT INTO diet_records
             (id, tenant_id, user_id, measured_at, meal_type, description, calories,
              protein_g, carbs_g, fat_g, alcohol_units, cigarettes_count)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [d.id, tenantId, userId, d.timestamp, d.mealType, d.description, d.calories,
           d.proteinGrams ?? null, d.carbsGrams ?? null, d.fatGrams ?? null,
           d.alcoholUnits ?? 0, d.cigarettesCount ?? 0]
        );
      }
      for (const md of store.timeSeries.lifestyle.medications) {
        await client.query(
          `INSERT INTO medications
             (id, tenant_id, user_id, condition, drug_name, dosage, frequency, schedule_time, start_date, active, last_taken_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [md.id, tenantId, userId, md.condition, md.drugName, md.dosage, md.frequency,
           JSON.stringify(md.scheduleTime), md.startDate, md.active, md.lastTakenTimestamp ?? null]
        );
      }
      for (const l of store.timeSeries.labResults) {
        await client.query(
          `INSERT INTO lab_results
             (id, tenant_id, user_id, measured_at, panel, test_name, value, unit,
              ref_min, ref_max, ref_optimal, status, source, ocr_confidence, reviewed,
              test_date, laboratory, patient_name)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
          [l.id, tenantId, userId, l.timestamp, l.panel, l.testName, l.value, l.unit,
           l.referenceRange.min, l.referenceRange.max, l.referenceRange.optimal ?? null,
           l.status, l.source, l.ocrConfidence ?? null, l.reviewedByPatient,
           l.testDate ?? null, l.laboratory ?? null, l.patientName ?? null]
        );
      }
      for (const a of store.auditTrail) {
        await client.query(
          `INSERT INTO audit_events
             (id, tenant_id, user_id, entity_type, entity_id, action, summary, reason, previous_value, new_value)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [a.id, tenantId, userId, a.entityType, a.recordId, a.action, a.summary, a.reason ?? null,
           a.previousValue != null ? JSON.stringify(a.previousValue) : null,
           a.newValue != null ? JSON.stringify(a.newValue) : null]
        );
      }
      for (const n of store.notifications) {
        await client.query(
          `INSERT INTO notifications (id, tenant_id, user_id, timestamp, title, message, type, read, action_link)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [n.id, tenantId, userId, n.timestamp, n.title, n.message, n.type, n.read, n.actionLink ?? null]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

async function upsertProfile(
  client: PoolClient,
  store: HealthSpanStore
): Promise<void> {
  const p = store.profile;
  await client.query(
    `UPDATE users SET
       full_name = $1, gender = $2, dob = $3, ethnicity = $4,
       initial_height_cm = $5, initial_weight_kg = $6, baseline_bp = $7,
       updated_at = now()
     WHERE id = $8`,
    [
      p.fullName, p.gender, p.dob, p.ethnicity,
      p.baselineBiometrics.initialHeightCm,
      p.baselineBiometrics.initialWeightKg,
      p.baselineBiometrics.baselineBloodPressure,
      store.userId,
    ]
  );
}

async function upsertPreferences(client: PoolClient, store: HealthSpanStore): Promise<void> {
  const prefs: NotificationPreferences = store.preferences;
  await client.query(
    `INSERT INTO notification_preferences (id, tenant_id, user_id, digest_frequency, in_app, push_enabled)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (tenant_id, user_id)
     DO UPDATE SET digest_frequency = $4, in_app = $5, push_enabled = $6`,
    [
      `pref-${store.userId}`, store.tenantId, store.userId,
      prefs.digestFrequency || 'weekly',
      prefs.inAppNotifications !== false,
      prefs.pushNotifications !== false,
    ]
  );
}

function mapBody(r: DBRow): BodyMetricRecord {
  const bp =
    r.bp_systolic != null || r.bp_diastolic != null
      ? {
          systolic: r.bp_systolic ?? null,
          diastolic: r.bp_diastolic ?? null,
        }
      : undefined;
  return {
    id: r.id as string,
    timestamp: new Date(r.measured_at as string).toISOString(),
    weightKg: optNumber(r.weight_kg),
    heightCm: optNumber(r.height_cm),
    bmi: optNumber(r.bmi),
    waistCircumferenceCm: optNumber(r.waist_cm),
    bloodPressure: bp as BodyMetricRecord['bloodPressure'],
    heartRateBpm: r.heart_rate_bpm != null ? Number(r.heart_rate_bpm) : undefined,
    notes: str(r.notes),
    status: r.status as BodyMetricRecord['status'],
  };
}

function mapSleep(r: DBRow): SleepRecord {
  return {
    id: r.id as string,
    timestamp: new Date(r.measured_at as string).toISOString(),
    durationHours: Number(r.duration_hours),
    qualityScore: optNumber(r.quality_score),
    bedtime: str(r.bedtime),
    wakeTime: str(r.wake_time),
    notes: str(r.notes),
  };
}

function mapExercise(r: DBRow): ExerciseRecord {
  return {
    id: r.id as string,
    timestamp: new Date(r.measured_at as string).toISOString(),
    activityType: r.activity_type as ExerciseRecord['activityType'],
    durationMinutes: Number(r.duration_minutes),
    intensity: r.intensity as ExerciseRecord['intensity'],
    caloriesBurned: optNumber(r.calories_burned),
    notes: str(r.notes),
  };
}

function mapDiet(r: DBRow): DietRecord {
  return {
    id: r.id as string,
    timestamp: new Date(r.measured_at as string).toISOString(),
    mealType: r.meal_type as DietRecord['mealType'],
    description: (str(r.description) as string) || '',
    calories: Number(r.calories),
    proteinGrams: optNumber(r.protein_g),
    carbsGrams: optNumber(r.carbs_g),
    fatGrams: optNumber(r.fat_g),
    alcoholUnits: optNumber(r.alcohol_units),
    cigarettesCount: r.cigarettes_count != null ? Number(r.cigarettes_count) : undefined,
  };
}

function mapMedication(r: DBRow): MedicationRecord {
  return {
    id: r.id as string,
    condition: (r.condition as string) || '',
    drugName: (r.drug_name as string) || '',
    dosage: (str(r.dosage) as string) || '',
    frequency: (str(r.frequency) as string) || '',
    scheduleTime: Array.isArray(r.schedule_time)
      ? (r.schedule_time as string[])
      : (JSON.parse(String(r.schedule_time || '[]')) as string[]),
    startDate: (str(r.start_date) as string) || '',
    active: r.active != null ? Boolean(r.active) : false,
    lastTakenTimestamp: r.last_taken_at
      ? new Date(r.last_taken_at as string).toISOString()
      : undefined,
  };
}

function mapLab(r: DBRow): LabResultRecord {
  return {
    id: r.id as string,
    timestamp: new Date(r.measured_at as string).toISOString(),
    panel: r.panel as LabResultRecord['panel'],
    testName: r.test_name as LabResultRecord['testName'],
    value: Number(r.value),
    unit: r.unit as LabResultRecord['unit'],
    referenceRange: {
      min: Number(r.ref_min ?? 0),
      max: Number(r.ref_max ?? 100),
      optimal: r.ref_optimal != null ? String(r.ref_optimal) : undefined,
    },
    status: r.status as LabResultRecord['status'],
    source: r.source as LabResultRecord['source'],
    ocrConfidence: optNumber(r.ocr_confidence),
    reviewedByPatient: r.reviewed !== false,
    testDate: r.test_date ? new Date(r.test_date as string).toISOString().slice(0, 10) : undefined,
    laboratory: r.laboratory != null ? String(r.laboratory) : undefined,
    patientName: r.patient_name != null ? String(r.patient_name) : undefined,
  };
}

function mapAudit(r: DBRow): AuditTrailRecord {
  return {
    id: r.id as string,
    timestamp: new Date(r.created_at as string).toISOString(),
    action: r.action as AuditTrailRecord['action'],
    entityType: r.entity_type as AuditTrailRecord['entityType'],
    recordId: r.entity_id as AuditTrailRecord['recordId'],
    summary: r.summary as AuditTrailRecord['summary'],
    previousValue: jsonParse(r.previous_value),
    newValue: jsonParse(r.new_value),
    reason: str(r.reason),
  };
}

function mapNotification(r: DBRow): InAppNotification {
  return {
    id: r.id as string,
    timestamp: new Date(r.timestamp as string).toISOString(),
    title: r.title as InAppNotification['title'],
    message: r.message as InAppNotification['message'],
    type: r.type as InAppNotification['type'],
    read: r.read != null ? Boolean(r.read) : false,
    actionLink: str(r.action_link),
  };
}

export const healthStoreRepository = new HealthStoreRepository();
