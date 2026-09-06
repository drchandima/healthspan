'use client';

import React from 'react';
import { HealthSpanStore, HealthScoreBreakdown, ClinicalInsight } from '@/lib/types';
import { EnrichedInsight } from '@/lib/insights/types';
import InsightCard from './InsightCard';
import EnrichedInsightCard from './EnrichedInsightCard';
import { Sparkles, Brain, ShieldAlert, Activity, TrendingUp, AlertTriangle, Loader } from 'lucide-react';

interface InsightsEngineTabProps {
  store: HealthSpanStore;
  scoreData: HealthScoreBreakdown;
  insights: ClinicalInsight[];
  enriched?: EnrichedInsight[];
  enrichedState?: 'idle' | 'loading' | 'loaded' | 'error';
  enrichedFallback?: boolean;
}

export default function InsightsEngineTab({ store, scoreData, insights, enriched = [], enrichedState = 'idle', enrichedFallback = true }: InsightsEngineTabProps) {
  const criticalInsights = insights.filter(i => i.severity === 'critical');
  const warningInsights = insights.filter(i => i.severity === 'warning');
  const infoInsights = insights.filter(i => i.severity === 'info');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Engine Title Header */}
      <div className="glass-card" style={{
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(16, 185, 129, 0.08))',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--cyan), var(--emerald))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
          }}>
            <Brain size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Clinical Risk Analysis & Prediction Engine</h2>
              <span className="badge badge-normal" style={{ fontSize: '0.68rem' }}>AI Multi-Domain</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Correlates cross-domain trajectory shifts (Body Metrics + Lifestyle + Biomarkers) to preempt metabolic and cardiovascular deterioration
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{
            padding: '8px 14px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'center'
          }}>
            <div className="mono-num" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--critical)' }}>{criticalInsights.length}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Critical Alerts</div>
          </div>

          <div style={{
            padding: '8px 14px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'center'
          }}>
            <div className="mono-num" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--amber)' }}>{warningInsights.length}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Warnings</div>
          </div>

          <div style={{
            padding: '8px 14px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'center'
          }}>
            <div className="mono-num" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--cyan)' }}>{infoInsights.length}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Optimizations</div>
          </div>
        </div>
      </div>

      {/* Health Score Breakdown Card with Animated Progress Bars */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Weighted Health Score Sub-System Breakdown</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Analytical formula: (Lab Biomarkers × 40%) + (Body Metrics × 30%) + (Lifestyle × 30%)
            </p>
          </div>
          <span className="badge badge-normal" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
            Overall: {scoreData.overallScore}/100 ({scoreData.scoreGrade})
          </span>
        </div>

        <div className="grid-3">
          {scoreData.contributions.map((c, idx) => {
            const barColor = c.score >= 80 ? 'var(--emerald)' : c.score >= 60 ? 'var(--amber)' : 'var(--critical)';
            return (
              <div
                key={idx}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.category}</span>
                  <span className="mono-num" style={{ fontWeight: 800, color: barColor }}>{c.score}/100</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${c.score}%`,
                    height: '100%',
                    background: barColor,
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 1s ease'
                  }} />
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {c.details}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Generated Insights List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Active Predictive Clinical Insights</h3>
        {insights.map(insight => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      {/* AI-Assisted Explanations (validated, decision-support only) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>AI-Assisted Explanations</h3>
          {enrichedState === 'loaded' && (
            <span className="badge badge-normal" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
              {enrichedFallback ? <ShieldAlert size={11} /> : <Sparkles size={11} />}
              {enrichedFallback ? 'Deterministic fallback (no LLM)' : 'LLM-validated explanations'}
            </span>
          )}
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '-8px' }}>
          Plain-language explanations generated from the deterministic findings above. These are
          decision-support summaries — they never compute scores, ranges, or trends, and are not a
          medical diagnosis.
        </p>

        {enrichedState === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <Loader size={15} className="spin" />
            Generating plain-language explanations from the deterministic evidence...
          </div>
        )}

        {enrichedState === 'error' && (
          <div style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid var(--warning-border)',
            fontSize: '0.82rem',
            color: 'var(--text-muted)'
          }}>
            <strong>AI explanations are temporarily unavailable.</strong> The deterministic insights
            above remain available and are always shown.
          </div>
        )}

        {enrichedState === 'loaded' && enriched.length > 0 && enriched.map((e, i) => (
          <EnrichedInsightCard key={e.id} enriched={e} index={i} isFallback={enrichedFallback} />
        ))}

        {enrichedState === 'loaded' && enriched.length === 0 && (
          <div style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.82rem',
            color: 'var(--text-muted)'
          }}>
            No additional plain-language explanations were generated for this dataset.
          </div>
        )}
      </div>
    </div>
  );
}
