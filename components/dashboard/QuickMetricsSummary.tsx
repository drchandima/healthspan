'use client';

import React from 'react';
import { HealthSpanStore } from '@/lib/types';
import { calculateBMI, classifyBMI, classifyBP } from '@/lib/referenceRanges';
import { useNow } from '@/hooks/useNow';
import { Scale, HeartPulse, Moon, Dumbbell, Pill, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface QuickMetricsSummaryProps {
  store: HealthSpanStore;
  onNavigateTab: (tab: string) => void;
}

export default function QuickMetricsSummary({ store, onNavigateTab }: QuickMetricsSummaryProps) {
  const { timeSeries, profile } = store;
  const now = useNow();

  const sortedBody = [...timeSeries.bodyMetrics].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const latestBody = sortedBody[sortedBody.length - 1];
  const weight = latestBody?.weightKg || profile.baselineBiometrics.initialWeightKg;
  const height = latestBody?.heightCm || profile.baselineBiometrics.initialHeightCm;
  const bmi = latestBody?.bmi || calculateBMI(weight, height);
  const bmiClassification = classifyBMI(bmi);

  const bp = latestBody?.bloodPressure || { systolic: 118, diastolic: 76 };
  const bpClassification = classifyBP(bp.systolic, bp.diastolic);

  const latestFBS = timeSeries.labResults.filter(l => l.testName === 'Fasting Blood Sugar').slice(-1)[0];
  const latestHbA1c = timeSeries.labResults.filter(l => l.testName === 'HbA1c').slice(-1)[0];

  const recentSleep = timeSeries.lifestyle.sleep.slice(-7);
  const avgSleep = recentSleep.length > 0 
    ? (recentSleep.reduce((acc, s) => acc + s.durationHours, 0) / recentSleep.length).toFixed(1)
    : '7.0';

  const recentExercise = timeSeries.lifestyle.exercise.slice(-7);
  const weeklyExerciseMins = recentExercise.reduce((acc, e) => acc + e.durationMinutes, 0);

  const activeMeds = timeSeries.lifestyle.medications.filter(m => m.active);
  const dueMeds = activeMeds.filter(m => {
    if (!m.lastTakenTimestamp) return true;
    const diffHours = (now - new Date(m.lastTakenTimestamp).getTime()) / (1000 * 60 * 60);
    return diffHours > 12;
  });

  return (
    <div className="grid-4" style={{ marginBottom: '24px' }}>
      {/* Card 1: Weight & BMI */}
      <div
        className="glass-card interactive"
        onClick={() => onNavigateTab('body-metrics')}
        style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--emerald)'
          }}>
            <Scale size={16} />
          </div>
          <span className={`badge ${bmiClassification.status === 'normal' ? 'badge-normal' : bmiClassification.status === 'warning' ? 'badge-warning' : 'badge-critical'}`}>
            {bmiClassification.label}
          </span>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Body Mass & BMI</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span className="mono-num" style={{ fontSize: '1.45rem', fontWeight: 800 }}>{weight}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>kg</span>
            <span style={{ color: 'var(--text-dim)', margin: '0 2px' }}>&bull;</span>
            <span className="mono-num" style={{ fontSize: '1.1rem', fontWeight: 700, color: bmiClassification.color }}>BMI {bmi.toFixed(1)}</span>
          </div>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Waist: {latestBody?.waistCircumferenceCm || 96} cm</span>
          <ArrowRight size={12} style={{ marginLeft: 'auto' }} />
        </div>
      </div>

      {/* Card 2: Blood Pressure */}
      <div
        className="glass-card interactive"
        onClick={() => onNavigateTab('body-metrics')}
        style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--critical)'
          }}>
            <HeartPulse size={16} />
          </div>
          <span className={`badge ${bpClassification.status === 'normal' ? 'badge-normal' : bpClassification.status === 'warning' ? 'badge-warning' : 'badge-critical'}`}>
            {bpClassification.label}
          </span>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vascular Pressure (BP)</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span className="mono-num" style={{ fontSize: '1.45rem', fontWeight: 800 }}>
              {bp.systolic}/{bp.diastolic}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>mmHg</span>
          </div>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Resting Pulse: {latestBody?.heartRateBpm || 72} bpm</span>
          <ArrowRight size={12} style={{ marginLeft: 'auto' }} />
        </div>
      </div>

      {/* Card 3: Blood Sugar & Biomarkers */}
      <div
        className="glass-card interactive"
        onClick={() => onNavigateTab('lab-results')}
        style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--amber)'
          }}>
            <Dumbbell size={16} />
          </div>
          <span className={`badge ${latestFBS?.status === 'normal' ? 'badge-normal' : 'badge-warning'}`}>
            {latestFBS ? latestFBS.status.toUpperCase() : 'OPTIMAL'}
          </span>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fasting Glucose / HbA1c</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span className="mono-num" style={{ fontSize: '1.45rem', fontWeight: 800 }}>
              {latestFBS ? latestFBS.value : '95'}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>mg/dL</span>
            <span style={{ color: 'var(--text-dim)', margin: '0 2px' }}>&bull;</span>
            <span className="mono-num" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {latestHbA1c ? `${latestHbA1c.value}%` : '5.5%'}
            </span>
          </div>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Latest panel: Aug 10, 2026</span>
          <ArrowRight size={12} style={{ marginLeft: 'auto' }} />
        </div>
      </div>

      {/* Card 4: Medications & Adherence */}
      <div
        className="glass-card interactive"
        onClick={() => onNavigateTab('lifestyle')}
        style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--indigo)'
          }}>
            <Pill size={16} />
          </div>
          <span className={`badge ${dueMeds.length > 0 ? 'badge-warning' : 'badge-normal'}`}>
            {dueMeds.length > 0 ? `${dueMeds.length} Dose Due` : 'Up to Date'}
          </span>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Medication Adherence</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span className="mono-num" style={{ fontSize: '1.45rem', fontWeight: 800 }}>
              {activeMeds.length}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active Regimens</span>
          </div>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Sleep: {avgSleep}h avg &bull; Exercise: {weeklyExerciseMins}m</span>
          <ArrowRight size={12} style={{ marginLeft: 'auto' }} />
        </div>
      </div>
    </div>
  );
}
