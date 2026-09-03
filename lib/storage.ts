import { HealthSpanStore, BodyMetricRecord, SleepRecord, ExerciseRecord, DietRecord, MedicationRecord, LabResultRecord, AuditTrailRecord, InAppNotification } from './types';
import { SEED_DEMO_STORE } from './seedData';
import { calculateBMI, classifyBMI, classifyBP } from './referenceRanges';

const STORAGE_KEY = 'healthspan_store_v1';
const CURRENT_USER_KEY = 'healthspan_current_user';

// ---------------------------------------------------------------------------
// Server-backed persistence.
//
// The database (PostgreSQL) is the source of truth. These functions call the
// authenticated API routes with the session cookie. localStorage is retained
// only as an offline/seed cache so the UI can render before a load completes.
// ---------------------------------------------------------------------------

export async function loadStoreFromServer(): Promise<HealthSpanStore | null> {
  try {
    const res = await fetch('/api/health-data', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.store) {
      // Keep a local cache copy.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.store));
      return data.store as HealthSpanStore;
    }
    return null;
  } catch (err) {
    console.error('Error loading store from server:', err);
    return getCachedLocalStore();
  }
}

export async function persistStore(store: HealthSpanStore): Promise<boolean> {
  try {
    const res = await fetch('/api/health-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store }),
    });
    if (!res.ok) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch (err) {
    console.error('Error persisting store to server:', err);
    // Offline fallback: keep an unsent copy in the local cache.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return false;
  }
}

export async function purgeAndResetStore(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
  try {
    await fetch('/api/health-data', { method: 'DELETE' });
  } catch (err) {
    console.error('Error purging server store:', err);
  }
}

function getCachedLocalStore(): HealthSpanStore | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as HealthSpanStore) : null;
  } catch {
    return null;
  }
}

/** Legacy sync accessor for the seeded store (used before login / SSR). */
export function getLocalStore(): HealthSpanStore {
  return getCachedLocalStore() ?? SEED_DEMO_STORE;
}

/** Legacy sync saver. Fire-and-forget persist to the server. */
export function saveLocalStore(store: HealthSpanStore): void {
  void persistStore(store);
}

// ------------------- AUDIT LOG HELPER -------------------
export function createAuditEntry(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityType: 'bodyMetrics' | 'lifestyle' | 'labResults' | 'profile' | 'medication',
  recordId: string,
  summary: string,
  reason?: string,
  previousValue?: unknown,
  newValue?: unknown
): AuditTrailRecord {
  return {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    action,
    entityType,
    recordId,
    summary,
    reason: reason || 'Manual user action',
    previousValue,
    newValue
  };
}

// ------------------- BODY METRICS -------------------
export function addBodyMetric(
  store: HealthSpanStore,
  record: Omit<BodyMetricRecord, 'id' | 'bmi' | 'status'>,
  reason?: string
): HealthSpanStore {
  const height = record.heightCm || store.profile.baselineBiometrics.initialHeightCm;
  const weight = record.weightKg || store.profile.baselineBiometrics.initialWeightKg;
  const bmi = calculateBMI(weight, height);
  
  let status: 'normal' | 'warning' | 'critical' = 'normal';
  const bmiClass = classifyBMI(bmi);
  if (bmiClass.status === 'critical') status = 'critical';
  else if (bmiClass.status === 'warning') status = 'warning';

  if (record.bloodPressure) {
    const bpClass = classifyBP(record.bloodPressure.systolic, record.bloodPressure.diastolic);
    if (bpClass.status === 'critical') status = 'critical';
    else if (bpClass.status === 'warning' && status !== 'critical') status = 'warning';
  }

  const newRecord: BodyMetricRecord = {
    ...record,
    id: `bm-${Date.now()}`,
    bmi,
    status
  };

  const audit = createAuditEntry(
    'CREATE',
    'bodyMetrics',
    newRecord.id,
    `Logged body metrics: Weight ${weight}kg, BMI ${bmi}, BP ${record.bloodPressure ? `${record.bloodPressure.systolic}/${record.bloodPressure.diastolic}` : 'N/A'}`,
    reason || 'Regular vitals logging',
    undefined,
    newRecord
  );

  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      bodyMetrics: [...store.timeSeries.bodyMetrics, newRecord]
    },
    auditTrail: [audit, ...store.auditTrail]
  };

  saveLocalStore(updated);
  return updated;
}

export function updateBodyMetric(
  store: HealthSpanStore,
  id: string,
  updates: Partial<BodyMetricRecord>,
  reason: string
): HealthSpanStore {
  const prev = store.timeSeries.bodyMetrics.find(b => b.id === id);
  if (!prev) return store;

  const height = updates.heightCm || prev.heightCm || store.profile.baselineBiometrics.initialHeightCm;
  const weight = updates.weightKg || prev.weightKg || store.profile.baselineBiometrics.initialWeightKg;
  const bmi = calculateBMI(weight, height);

  let status: 'normal' | 'warning' | 'critical' = 'normal';
  const bmiClass = classifyBMI(bmi);
  if (bmiClass.status === 'critical') status = 'critical';
  else if (bmiClass.status === 'warning') status = 'warning';

  const bpToEvaluate = updates.bloodPressure !== undefined ? updates.bloodPressure : prev.bloodPressure;
  if (bpToEvaluate) {
    const bpClass = classifyBP(bpToEvaluate.systolic, bpToEvaluate.diastolic);
    if (bpClass.status === 'critical') status = 'critical';
    else if (bpClass.status === 'warning' && status !== 'critical') status = 'warning';
  }

  const updatedRecord: BodyMetricRecord = {
    ...prev,
    ...updates,
    bmi,
    status
  };

  const audit = createAuditEntry(
    'UPDATE',
    'bodyMetrics',
    id,
    `Updated body metric record (${id}): Weight ${weight}kg`,
    reason,
    prev,
    updatedRecord
  );

  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      bodyMetrics: store.timeSeries.bodyMetrics.map(b => b.id === id ? updatedRecord : b)
    },
    auditTrail: [audit, ...store.auditTrail]
  };

  saveLocalStore(updated);
  return updated;
}

export function deleteBodyMetric(
  store: HealthSpanStore,
  id: string,
  reason: string
): HealthSpanStore {
  const prev = store.timeSeries.bodyMetrics.find(b => b.id === id);
  if (!prev) return store;

  const audit = createAuditEntry(
    'DELETE',
    'bodyMetrics',
    id,
    `Deleted body metric measurement recorded on ${new Date(prev.timestamp).toLocaleString()}`,
    reason,
    prev,
    undefined
  );

  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      bodyMetrics: store.timeSeries.bodyMetrics.filter(b => b.id !== id)
    },
    auditTrail: [audit, ...store.auditTrail]
  };

  saveLocalStore(updated);
  return updated;
}

// ------------------- LIFESTYLE: SLEEP -------------------
export function addSleepRecord(store: HealthSpanStore, record: Omit<SleepRecord, 'id'>): HealthSpanStore {
  const newRecord: SleepRecord = { ...record, id: `sl-${Date.now()}` };
  const audit = createAuditEntry(
    'CREATE',
    'lifestyle',
    newRecord.id,
    `Logged sleep: ${record.durationHours} hrs (Quality: ${record.qualityScore || 'N/A'}/100)`
  );
  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      lifestyle: {
        ...store.timeSeries.lifestyle,
        sleep: [...store.timeSeries.lifestyle.sleep, newRecord]
      }
    },
    auditTrail: [audit, ...store.auditTrail]
  };
  saveLocalStore(updated);
  return updated;
}

export function updateSleepRecord(store: HealthSpanStore, id: string, updates: Partial<SleepRecord>, reason: string): HealthSpanStore {
  const prev = store.timeSeries.lifestyle.sleep.find(s => s.id === id);
  if (!prev) return store;
  const updatedRecord = { ...prev, ...updates };
  const audit = createAuditEntry('UPDATE', 'lifestyle', id, `Updated sleep record (${id}): ${updatedRecord.durationHours} hrs`, reason, prev, updatedRecord);
  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      lifestyle: {
        ...store.timeSeries.lifestyle,
        sleep: store.timeSeries.lifestyle.sleep.map(s => s.id === id ? updatedRecord : s)
      }
    },
    auditTrail: [audit, ...store.auditTrail]
  };
  saveLocalStore(updated);
  return updated;
}

export function deleteSleepRecord(store: HealthSpanStore, id: string, reason: string): HealthSpanStore {
  const prev = store.timeSeries.lifestyle.sleep.find(s => s.id === id);
  if (!prev) return store;
  const audit = createAuditEntry('DELETE', 'lifestyle', id, `Deleted sleep record (${prev.durationHours} hrs) on ${new Date(prev.timestamp).toLocaleDateString()}`, reason, prev, undefined);
  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      lifestyle: {
        ...store.timeSeries.lifestyle,
        sleep: store.timeSeries.lifestyle.sleep.filter(s => s.id !== id)
      }
    },
    auditTrail: [audit, ...store.auditTrail]
  };
  saveLocalStore(updated);
  return updated;
}

// ------------------- LIFESTYLE: EXERCISE -------------------
export function addExerciseRecord(store: HealthSpanStore, record: Omit<ExerciseRecord, 'id'>): HealthSpanStore {
  const newRecord: ExerciseRecord = { ...record, id: `ex-${Date.now()}` };
  const audit = createAuditEntry(
    'CREATE',
    'lifestyle',
    newRecord.id,
    `Logged exercise: ${record.activityType} for ${record.durationMinutes} mins (${record.intensity} intensity)`
  );
  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      lifestyle: {
        ...store.timeSeries.lifestyle,
        exercise: [...store.timeSeries.lifestyle.exercise, newRecord]
      }
    },
    auditTrail: [audit, ...store.auditTrail]
  };
  saveLocalStore(updated);
  return updated;
}

export function updateExerciseRecord(store: HealthSpanStore, id: string, updates: Partial<ExerciseRecord>, reason: string): HealthSpanStore {
  const prev = store.timeSeries.lifestyle.exercise.find(e => e.id === id);
  if (!prev) return store;
  const updatedRecord = { ...prev, ...updates };
  const audit = createAuditEntry('UPDATE', 'lifestyle', id, `Updated exercise record: ${updatedRecord.activityType} (${updatedRecord.durationMinutes} mins)`, reason, prev, updatedRecord);
  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      lifestyle: {
        ...store.timeSeries.lifestyle,
        exercise: store.timeSeries.lifestyle.exercise.map(e => e.id === id ? updatedRecord : e)
      }
    },
    auditTrail: [audit, ...store.auditTrail]
  };
  saveLocalStore(updated);
  return updated;
}

export function deleteExerciseRecord(store: HealthSpanStore, id: string, reason: string): HealthSpanStore {
  const prev = store.timeSeries.lifestyle.exercise.find(e => e.id === id);
  if (!prev) return store;
  const audit = createAuditEntry('DELETE', 'lifestyle', id, `Deleted exercise record: ${prev.activityType} (${prev.durationMinutes} mins)`, reason, prev, undefined);
  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      lifestyle: {
        ...store.timeSeries.lifestyle,
        exercise: store.timeSeries.lifestyle.exercise.filter(e => e.id !== id)
      }
    },
    auditTrail: [audit, ...store.auditTrail]
  };
  saveLocalStore(updated);
  return updated;
}

// ------------------- LIFESTYLE: DIET -------------------
export function addDietRecord(store: HealthSpanStore, record: Omit<DietRecord, 'id'>): HealthSpanStore {
  const newRecord: DietRecord = { ...record, id: `dt-${Date.now()}` };
  const audit = createAuditEntry(
    'CREATE',
    'lifestyle',
    newRecord.id,
    `Logged meal: ${record.mealType} (${record.calories} kcal) - ${record.description}`
  );
  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      lifestyle: {
        ...store.timeSeries.lifestyle,
        diet: [...store.timeSeries.lifestyle.diet, newRecord]
      }
    },
    auditTrail: [audit, ...store.auditTrail]
  };
  saveLocalStore(updated);
  return updated;
}

export function updateDietRecord(store: HealthSpanStore, id: string, updates: Partial<DietRecord>, reason: string): HealthSpanStore {
  const prev = store.timeSeries.lifestyle.diet.find(d => d.id === id);
  if (!prev) return store;
  const updatedRecord = { ...prev, ...updates };
  const audit = createAuditEntry('UPDATE', 'lifestyle', id, `Updated meal record: ${updatedRecord.mealType} (${updatedRecord.calories} kcal)`, reason, prev, updatedRecord);
  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      lifestyle: {
        ...store.timeSeries.lifestyle,
        diet: store.timeSeries.lifestyle.diet.map(d => d.id === id ? updatedRecord : d)
      }
    },
    auditTrail: [audit, ...store.auditTrail]
  };
  saveLocalStore(updated);
  return updated;
}

export function deleteDietRecord(store: HealthSpanStore, id: string, reason: string): HealthSpanStore {
  const prev = store.timeSeries.lifestyle.diet.find(d => d.id === id);
  if (!prev) return store;
  const audit = createAuditEntry('DELETE', 'lifestyle', id, `Deleted meal record: ${prev.mealType} (${prev.calories} kcal)`, reason, prev, undefined);
  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      lifestyle: {
        ...store.timeSeries.lifestyle,
        diet: store.timeSeries.lifestyle.diet.filter(d => d.id !== id)
      }
    },
    auditTrail: [audit, ...store.auditTrail]
  };
  saveLocalStore(updated);
  return updated;
}

// ------------------- LIFESTYLE: MEDICATIONS -------------------
export function addMedication(store: HealthSpanStore, record: Omit<MedicationRecord, 'id'>): HealthSpanStore {
  const newRecord: MedicationRecord = { ...record, id: `med-${Date.now()}` };
  const audit = createAuditEntry(
    'CREATE',
    'medication',
    newRecord.id,
    `Added active medication: ${record.drugName} (${record.dosage}) for ${record.condition}`
  );
  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      lifestyle: {
        ...store.timeSeries.lifestyle,
        medications: [...store.timeSeries.lifestyle.medications, newRecord]
      }
    },
    auditTrail: [audit, ...store.auditTrail]
  };
  saveLocalStore(updated);
  return updated;
}

export function updateMedication(store: HealthSpanStore, id: string, updates: Partial<MedicationRecord>, reason: string): HealthSpanStore {
  const prev = store.timeSeries.lifestyle.medications.find(m => m.id === id);
  if (!prev) return store;
  const updatedRecord = { ...prev, ...updates };
  const audit = createAuditEntry('UPDATE', 'medication', id, `Updated medication: ${updatedRecord.drugName} (${updatedRecord.dosage})`, reason, prev, updatedRecord);
  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      lifestyle: {
        ...store.timeSeries.lifestyle,
        medications: store.timeSeries.lifestyle.medications.map(m => m.id === id ? updatedRecord : m)
      }
    },
    auditTrail: [audit, ...store.auditTrail]
  };
  saveLocalStore(updated);
  return updated;
}

export function deleteMedication(store: HealthSpanStore, id: string, reason: string): HealthSpanStore {
  const prev = store.timeSeries.lifestyle.medications.find(m => m.id === id);
  if (!prev) return store;
  const audit = createAuditEntry('DELETE', 'medication', id, `Deleted medication: ${prev.drugName} (${prev.dosage})`, reason, prev, undefined);
  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      lifestyle: {
        ...store.timeSeries.lifestyle,
        medications: store.timeSeries.lifestyle.medications.filter(m => m.id !== id)
      }
    },
    auditTrail: [audit, ...store.auditTrail]
  };
  saveLocalStore(updated);
  return updated;
}

export function markMedicationTaken(store: HealthSpanStore, medId: string): HealthSpanStore {
  const now = new Date().toISOString();
  const med = store.timeSeries.lifestyle.medications.find(m => m.id === medId);
  if (!med) return store;

  const audit = createAuditEntry(
    'UPDATE',
    'medication',
    medId,
    `Marked dose taken for ${med.drugName} (${med.dosage}) at ${new Date(now).toLocaleTimeString()}`
  );

  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      lifestyle: {
        ...store.timeSeries.lifestyle,
        medications: store.timeSeries.lifestyle.medications.map(m =>
          m.id === medId ? { ...m, lastTakenTimestamp: now } : m
        )
      }
    },
    auditTrail: [audit, ...store.auditTrail]
  };
  saveLocalStore(updated);
  return updated;
}

// ------------------- LAB RESULTS -------------------
export function addLabResult(store: HealthSpanStore, record: Omit<LabResultRecord, 'id'>): HealthSpanStore {
  const newRecord: LabResultRecord = { ...record, id: `lab-${Date.now()}` };
  const audit = createAuditEntry(
    'CREATE',
    'labResults',
    newRecord.id,
    `Logged lab result: ${record.testName} = ${record.value} ${record.unit} (${record.status.toUpperCase()})`
  );
  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      labResults: [...store.timeSeries.labResults, newRecord]
    },
    auditTrail: [audit, ...store.auditTrail]
  };
  saveLocalStore(updated);
  return updated;
}

export function batchAddLabResults(store: HealthSpanStore, records: Omit<LabResultRecord, 'id'>[]): HealthSpanStore {
  const newItems: LabResultRecord[] = records.map((r, i) => ({
    ...r,
    id: `lab-${Date.now()}-${i}`
  }));

  const audits: AuditTrailRecord[] = newItems.map(item =>
    createAuditEntry(
      'CREATE',
      'labResults',
      item.id,
      `OCR Batch Ingest: ${item.testName} = ${item.value} ${item.unit} (Confidence: ${item.ocrConfidence || 95}%)`,
      'OCR Report Extraction Confirmed'
    )
  );

  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      labResults: [...store.timeSeries.labResults, ...newItems]
    },
    auditTrail: [...audits, ...store.auditTrail]
  };
  saveLocalStore(updated);
  return updated;
}

export function updateLabResult(
  store: HealthSpanStore,
  id: string,
  updates: Partial<LabResultRecord>,
  reason: string
): HealthSpanStore {
  const prev = store.timeSeries.labResults.find(l => l.id === id);
  if (!prev) return store;

  const updatedRecord: LabResultRecord = {
    ...prev,
    ...updates
  };

  const audit = createAuditEntry(
    'UPDATE',
    'labResults',
    id,
    `Updated lab result (${id}): ${updatedRecord.testName} = ${updatedRecord.value} ${updatedRecord.unit}`,
    reason,
    prev,
    updatedRecord
  );

  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      labResults: store.timeSeries.labResults.map(l => l.id === id ? updatedRecord : l)
    },
    auditTrail: [audit, ...store.auditTrail]
  };

  saveLocalStore(updated);
  return updated;
}

export function deleteLabResult(
  store: HealthSpanStore,
  id: string,
  reason: string
): HealthSpanStore {
  const prev = store.timeSeries.labResults.find(l => l.id === id);
  if (!prev) return store;

  const audit = createAuditEntry(
    'DELETE',
    'labResults',
    id,
    `Deleted lab result (${prev.testName} = ${prev.value} ${prev.unit}) recorded on ${new Date(prev.timestamp).toLocaleString()}`,
    reason,
    prev,
    undefined
  );

  const updated: HealthSpanStore = {
    ...store,
    timeSeries: {
      ...store.timeSeries,
      labResults: store.timeSeries.labResults.filter(l => l.id !== id)
    },
    auditTrail: [audit, ...store.auditTrail]
  };

  saveLocalStore(updated);
  return updated;
}


// ------------------- DATA EXPORT HELPERS -------------------
export function generateExportData(store: HealthSpanStore, format: 'json' | 'csv'): { content: string; filename: string; mimeType: string } {
  const dateStr = new Date().toISOString().split('T')[0];
  if (format === 'json') {
    return {
      content: JSON.stringify(store, null, 2),
      filename: `HealthSpan_Export_${store.userId}_${dateStr}.json`,
      mimeType: 'application/json'
    };
  }

  // Multi-section CSV
  let csv = `HEALTHSPAN PATIENT HEALTH RECORD EXPORT\n`;
  csv += `Generated At: ${new Date().toISOString()}\n`;
  csv += `User ID: ${store.userId}\nTenant ID: ${store.tenantId}\nPatient: ${store.profile.fullName}\nDOB: ${store.profile.dob}\nGender: ${store.profile.gender}\n\n`;

  csv += `--- SECTION 1: BODY METRICS (TIMESERIES) ---\n`;
  csv += `Timestamp,Weight (kg),Height (cm),BMI,Systolic BP (mmHg),Diastolic BP (mmHg),Waist (cm),Heart Rate (bpm),Status,Notes\n`;
  store.timeSeries.bodyMetrics.forEach(b => {
    csv += `"${b.timestamp}",${b.weightKg || ''},${b.heightCm || ''},${b.bmi || ''},${b.bloodPressure?.systolic || ''},${b.bloodPressure?.diastolic || ''},${b.waistCircumferenceCm || ''},${b.heartRateBpm || ''},"${b.status}","${(b.notes || '').replace(/"/g, '""')}"\n`;
  });

  csv += `\n--- SECTION 2: LAB RESULTS ---\n`;
  csv += `Timestamp,Panel,Test Name,Value,Unit,Reference Min,Reference Max,Status,Source,OCR Confidence\n`;
  store.timeSeries.labResults.forEach(l => {
    csv += `"${l.timestamp}","${l.panel}","${l.testName}",${l.value},"${l.unit}",${l.referenceRange.min},${l.referenceRange.max},"${l.status}","${l.source}",${l.ocrConfidence || ''}\n`;
  });

  csv += `\n--- SECTION 3: LIFESTYLE - SLEEP ---\n`;
  csv += `Timestamp,Duration (hrs),Quality Score,Bedtime,Wake Time,Notes\n`;
  store.timeSeries.lifestyle.sleep.forEach(s => {
    csv += `"${s.timestamp}",${s.durationHours},${s.qualityScore || ''},"${s.bedtime || ''}","${s.wakeTime || ''}","${(s.notes || '').replace(/"/g, '""')}"\n`;
  });

  csv += `\n--- SECTION 4: LIFESTYLE - EXERCISE ---\n`;
  csv += `Timestamp,Activity Type,Duration (mins),Intensity,Calories Burned,Notes\n`;
  store.timeSeries.lifestyle.exercise.forEach(e => {
    csv += `"${e.timestamp}","${e.activityType}",${e.durationMinutes},"${e.intensity}",${e.caloriesBurned || ''},"${(e.notes || '').replace(/"/g, '""')}"\n`;
  });

  csv += `\n--- SECTION 5: LIFESTYLE - DIET ---\n`;
  csv += `Timestamp,Meal Type,Description,Calories (kcal),Protein (g),Carbs (g),Fat (g),Alcohol Units,Cigarettes\n`;
  store.timeSeries.lifestyle.diet.forEach(d => {
    csv += `"${d.timestamp}","${d.mealType}","${d.description.replace(/"/g, '""')}",${d.calories},${d.proteinGrams || ''},${d.carbsGrams || ''},${d.fatGrams || ''},${d.alcoholUnits || 0},${d.cigarettesCount || 0}\n`;
  });

  csv += `\n--- SECTION 6: MEDICATIONS ---\n`;
  csv += `Condition,Drug Name,Dosage,Frequency,Schedule Times,Active,Last Taken\n`;
  store.timeSeries.lifestyle.medications.forEach(m => {
    csv += `"${m.condition}","${m.drugName}","${m.dosage}","${m.frequency}","${m.scheduleTime.join('; ')}",${m.active},"${m.lastTakenTimestamp || ''}"\n`;
  });

  csv += `\n--- SECTION 7: AUDIT TRAIL (IMMUTABLE LOG) ---\n`;
  csv += `Timestamp,Action,Entity Type,Record ID,Summary,Reason\n`;
  store.auditTrail.forEach(a => {
    csv += `"${a.timestamp}","${a.action}","${a.entityType}","${a.recordId}","${a.summary.replace(/"/g, '""')}","${(a.reason || '').replace(/"/g, '""')}"\n`;
  });

  return {
    content: csv,
    filename: `HealthSpan_Export_${store.userId}_${dateStr}.csv`,
    mimeType: 'text/csv'
  };
}
