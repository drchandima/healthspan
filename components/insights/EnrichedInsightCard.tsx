'use client';

import React from 'react';
import { EnrichedInsight } from '@/lib/insights/types';
import { Sparkles, ShieldAlert, Stethoscope, Lightbulb } from 'lucide-react';

interface EnrichedInsightCardProps {
  enriched: EnrichedInsight;
  index: number;
  isFallback: boolean;
}

/**
 * Presents a single validated LLM-assisted explanation alongside its
 * deterministic source finding. The source badge makes it explicit that this
 * content is an explanation generated from rule-based evidence — never a
 * diagnosis — and the fallback badge shows when the plain-language layer came
 * from the deterministic engine instead of an LLM.
 */
export default function EnrichedInsightCard({ enriched, index, isFallback }: EnrichedInsightCardProps) {
  return (
    <div
      className="glass-card"
      style={{
        padding: '20px 24px',
        borderColor: 'rgba(6, 182, 212, 0.3)',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.06), rgba(17, 24, 39, 0.85))',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'rgba(6, 182, 212, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--cyan)'
          }}>
            <Sparkles size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              AI-Assisted Explanation #{index + 1}
            </div>
            <h4 style={{ fontSize: '1.02rem', fontWeight: 800, marginTop: '2px' }}>
              {enriched.title}
            </h4>
          </div>
        </div>
        {isFallback ? (
          <span className="badge badge-warning" style={{ gap: '6px', padding: '4px 10px', fontSize: '0.68rem' }}>
            <ShieldAlert size={12} /> Deterministic Fallback
          </span>
        ) : (
          <span className="badge badge-normal" style={{ gap: '6px', padding: '4px 10px', fontSize: '0.68rem' }}>
            <Sparkles size={12} /> LLM-Explained
          </span>
        )}
      </div>

      {/* Explanation */}
      <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
        {enriched.summary}
      </p>

      {/* Lifestyle guidance */}
      {enriched.suggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lightbulb size={14} />
            General Lifestyle Guidance (not medical advice)
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '4px' }}>
            {enriched.suggestions.map((s, idx) => (
              <li key={idx} style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: 'var(--emerald)', fontWeight: 800 }}>&bull;</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Doctor consult callout — only present for concerning findings */}
      {enriched.doctorConsultReason && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid var(--warning-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Stethoscope size={16} style={{ color: 'var(--amber)', flexShrink: 0 }} />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
            <strong>Consider consultation:</strong> {enriched.doctorConsultReason}
          </div>
        </div>
      )}
    </div>
  );
}