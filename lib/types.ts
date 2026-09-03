export type StatusType = 'normal' | 'warning' | 'critical' | 'borderline';

export interface UserAccount {
  email: string;
  passwordHash: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface UserProfile {
  fullName: string;
  dob: string; // YYYY-MM-DD
  gender: 'male' | 'female' | 'other';
  ethnicity: string;
  baselineBiometrics: {
    initialHeightCm: number;
    initialWeightKg: number;
    baselineBloodPressure: string; // "120/80"
  };
}

export interface BodyMetricRecord {
  id: string;
  timestamp: string; // ISO string or "YYYY.MM.DD HH:mm"
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  waistCircumferenceCm?: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
    pulse?: number;
  };
  heartRateBpm?: number;
  notes?: string;
  status: 'normal' | 'warning' | 'critical';
}

export interface SleepRecord {
  id: string;
  timestamp: string;
  durationHours: number; // e.g. 7.5
  qualityScore?: number; // 1-100
  bedtime?: string;
  wakeTime?: string;
  notes?: string;
}

export interface ExerciseRecord {
  id: string;
  timestamp: string;
  activityType: 'Cardio' | 'Strength' | 'HIIT' | 'Walking' | 'Swimming' | 'Cycling' | 'Yoga' | 'Other';
  durationMinutes: number;
  intensity: 'Low' | 'Moderate' | 'High';
  caloriesBurned?: number;
  notes?: string;
}

export interface DietRecord {
  id: string;
  timestamp: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  description: string;
  calories: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  alcoholUnits?: number; // Standard drinks
  cigarettesCount?: number; // Tobacco tracking
}

export interface MedicationRecord {
  id: string;
  condition: string; // e.g. "Type 2 Diabetes", "Hypertension", "Dyslipidemia"
  drugName: string; // e.g. "Metformin", "Amlodipine", "Atorvastatin"
  dosage: string; // e.g. "500mg"
  frequency: string; // e.g. "Twice daily after meals"
  scheduleTime: string[]; // ["08:00", "20:00"]
  startDate: string;
  active: boolean;
  lastTakenTimestamp?: string;
}

export type LabPanelType = 'Hemoglobin' | 'Blood Sugar' | 'Lipid Panel' | 'Renal Function' | 'Liver Function';

export interface ReferenceRange {
  min: number;
  max: number;
  optimal?: string;
  unit: string;
}

export interface LabResultRecord {
  id: string;
  timestamp: string;
  panel: LabPanelType;
  testName: string;
  value: number;
  unit: string;
  referenceRange: {
    min: number;
    max: number;
    optimal?: string;
  };
  status: 'normal' | 'borderline' | 'critical';
  source: 'manual' | 'ocr_upload';
  ocrConfidence?: number; // 0 - 100%
  reviewedByPatient: boolean;
  /** Optional metadata captured from an LLM/OCR extraction, when available. */
  testDate?: string;
  laboratory?: string;
  patientName?: string;
}

export interface AuditTrailRecord {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'bodyMetrics' | 'lifestyle' | 'labResults' | 'profile' | 'medication';
  recordId: string;
  summary: string;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string;
}

export interface NotificationPreferences {
  digestFrequency: 'weekly' | 'monthly' | 'off';
  inAppNotifications: boolean;
  pushNotifications: boolean;
}

export interface InAppNotification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'reminder';
  read: boolean;
  actionLink?: string;
}

export interface HealthSpanStore {
  version: string;
  tenantId: string;
  userId: string;
  account: UserAccount;
  profile: UserProfile;
  timeSeries: {
    bodyMetrics: BodyMetricRecord[];
    lifestyle: {
      sleep: SleepRecord[];
      exercise: ExerciseRecord[];
      diet: DietRecord[];
      medications: MedicationRecord[];
    };
    labResults: LabResultRecord[];
  };
  auditTrail: AuditTrailRecord[];
  preferences: NotificationPreferences;
  notifications: InAppNotification[];
}

export interface HealthScoreBreakdown {
  overallScore: number; // 0 - 100
  bodyMetricsScore: number; // 0 - 100 (30% weight)
  lifestyleScore: number; // 0 - 100 (30% weight)
  labBiomarkersScore: number; // 0 - 100 (40% weight)
  scoreGrade: 'Optimal' | 'Good' | 'Fair' | 'Needs Attention' | 'Critical';
  contributions: {
    category: string;
    score: number;
    weight: number;
    status: 'optimal' | 'warning' | 'critical';
    details: string;
  }[];
  trendHistory: {
    date: string;
    score: number;
  }[];
}

export interface ClinicalInsight {
  id: string;
  title: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'Metabolic' | 'Cardiovascular' | 'Lifestyle' | 'Renal' | 'Hepatic' | 'Medication';
  finding: string;
  metricsInvolved: string[];
  lifestyleSuggestions: string[];
  doctorConsultRequired: boolean;
  doctorConsultReason?: string;
  detectedAt: string;
}

export interface ExtractedOcrField {
  testName: string;
  panel: LabPanelType;
  extractedValue: number;
  unit: string;
  confidence: number; // 0-100
  isLowConfidence: boolean;
  referenceMin: number;
  referenceMax: number;
  status: 'normal' | 'borderline' | 'critical';
  verified: boolean;
  /** The exact text the model read for the value, for review. */
  rawValue?: string;
  /** The model's plain-language reason for this read, for review/audit. */
  note?: string;
}

export interface LabReportPatientInfo {
  patientName?: string;
  patientId?: string;
  dateOfBirth?: string;
  /** Confidence for the patient block, if known (0-100). */
  confidence?: number;
}

/**
 * A single structured document produced by an OCR/LLM provider, before
 * schema validation and confidence evaluation. Raw, un-trusted output.
 */
export interface RawLabReportExtraction {
  patient?: LabReportPatientInfo;
  testDate?: string;
  laboratory?: string;
  fields: Array<{
    testName?: string;
    value?: number | string;
    unit?: string;
    referenceMin?: number | string;
    referenceMax?: number | string;
    confidence?: number;
    rawValue?: string;
    note?: string;
  }>;
}

/**
 * The validated, confidence-scored extraction that is safe to present to the
 * user for review. Still a candidate until the user confirms.
 */
export interface LabReportExtraction {
  patient?: LabReportPatientInfo;
  testDate?: string;
  laboratory?: string;
  fields: ExtractedOcrField[];
  /** Field-level issues found during validation (missing/invalid values). */
  warnings: string[];
}

export interface OcrScanResult {
  success: boolean;
  filename: string;
  extractedCount: number;
  lowConfidenceCount: number;
  document: LabReportExtraction;
  processedAt: string;
  /** True when no provider is configured and a deterministic fallback ran. */
  fallback?: boolean;
}
