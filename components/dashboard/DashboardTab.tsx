'use client';

import React from 'react';
import { HealthSpanStore, HealthScoreBreakdown, ClinicalInsight } from '@/lib/types';
import HealthScoreGauge from './HealthScoreGauge';
import HealthScoreTrend from './HealthScoreTrend';
import QuickMetricsSummary from './QuickMetricsSummary';
import TopInsightsList from './TopInsightsList';
import { useNow } from '@/hooks/useNow';
import { User, Calendar, PlusCircle, ShieldCheck, Dna, FileText, Activity } from 'lucide-react';

interface DashboardTabProps {
  store: HealthSpanStore;
  scoreData: HealthScoreBreakdown;
  insights: ClinicalInsight[];
  onNavigateTab: (tab: string) => void;
  onOpenQuickLog: () => void;
}

export default function DashboardTab({
  store,
  scoreData,
  insights,
  onNavigateTab,
  onOpenQuickLog
}: DashboardTabProps) {
  const { profile, timeSeries } = store;
  const now = useNow();

  // Calculate patient age from DOB
  const calculateAge = (dobString: string) => {
    if (!dobString) return 44;
    const birthDate = new Date(dobString);
    const diffMs = now - birthDate.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const patientAge = calculateAge(profile.dob);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Patient Profile Header Card */}
      <div className="glass-card" style={{
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(15, 23, 42, 0.85))',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--emerald), var(--cyan))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '1.4rem',
            fontWeight: 800,
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
          }}>
            {profile.fullName.charAt(0)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{profile.fullName}</h2>
              <span className="badge badge-normal" style={{ fontSize: '0.7rem' }}>
                <ShieldCheck size={12} /> Active EHR
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={14} style={{ color: 'var(--cyan)' }} />
                <span>Age {patientAge} ({profile.dob})</span>
              </span>
              <span>&bull;</span>
              <span>Gender: <strong style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>{profile.gender}</strong></span>
              <span>&bull;</span>
              <span>Ethnicity: <strong style={{ color: 'var(--text-main)' }}>{profile.ethnicity}</strong></span>
              <span>&bull;</span>
              <span>Baseline Height: <strong style={{ color: 'var(--text-main)' }}>{profile.baselineBiometrics.initialHeightCm} cm</strong></span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onOpenQuickLog}
            className="btn btn-primary"
            style={{ gap: '8px' }}
          >
            <PlusCircle size={16} />
            <span>Log Time-Series Metric</span>
          </button>
          <button
            onClick={() => onNavigateTab('lab-results')}
            className="btn btn-secondary"
            style={{ gap: '8px' }}
          >
            <FileText size={16} />
            <span>OCR Lab Ingest</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Summary Cards */}
      <QuickMetricsSummary store={store} onNavigateTab={onNavigateTab} />

      {/* Health Score Gauge & Score Longitudinal Trend Grid */}
      <div className="grid-2">
        <HealthScoreGauge
          scoreData={scoreData}
          onExploreInsights={() => onNavigateTab('insights')}
        />
        <HealthScoreTrend
          trendHistory={scoreData.trendHistory}
        />
      </div>

      {/* Top 5 Ranked Insights */}
      <TopInsightsList
        insights={insights}
        onExploreAll={() => onNavigateTab('insights')}
      />
    </div>
  );
}
