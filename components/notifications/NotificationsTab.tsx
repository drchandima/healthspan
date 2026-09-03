'use client';

import React, { useState } from 'react';
import { HealthSpanStore, HealthScoreBreakdown, ClinicalInsight } from '@/lib/types';
import { saveLocalStore } from '@/lib/storage';
import { Bell, Mail, Smartphone, Check, Sparkles, Send, ShieldCheck, AlertTriangle } from 'lucide-react';

interface NotificationsTabProps {
  store: HealthSpanStore;
  scoreData: HealthScoreBreakdown;
  insights: ClinicalInsight[];
  onUpdateStore: (store: HealthSpanStore) => void;
}

export default function NotificationsTab({
  store,
  scoreData,
  insights,
  onUpdateStore
}: NotificationsTabProps) {
  const [digestFreq, setDigestFreq] = useState<'weekly' | 'monthly' | 'off'>(store.preferences.digestFrequency || 'weekly');
  const [inAppToggle, setInAppToggle] = useState(store.preferences.inAppNotifications);
  const [pushToggle, setPushToggle] = useState(store.preferences.pushNotifications);
  const [sendTestStatus, setSendTestStatus] = useState<string | null>(null);

  const handleSavePreferences = (newFreq: 'weekly' | 'monthly' | 'off', newInApp: boolean, newPush: boolean) => {
    setDigestFreq(newFreq);
    setInAppToggle(newInApp);
    setPushToggle(newPush);

    const updated: HealthSpanStore = {
      ...store,
      preferences: {
        digestFrequency: newFreq,
        inAppNotifications: newInApp,
        pushNotifications: newPush
      }
    };
    onUpdateStore(updated);
    saveLocalStore(updated);
  };

  const handleTriggerSimulatedPush = () => {
    setSendTestStatus('Push notification dispatched to device!');
    setTimeout(() => setSendTestStatus(null), 3500);
  };

  const topInsight = insights[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Notification Center & Clinical Digests</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Manage periodic health score summaries, in-app alerts, and web push configurations
        </p>
      </div>

      <div className="grid-2">
        {/* Left Column: Notification Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Email Digest Frequency Card */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--emerald)'
              }}>
                <Mail size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Email Digest Frequency</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Summaries covering Health Score, new insights, and missing data reminders
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { id: 'weekly', title: 'Weekly Clinical Digest', desc: 'Sent every Sunday at 08:00 AM. Recommended for proactive tracking.' },
                { id: 'monthly', title: 'Monthly Executive Summary', desc: 'Sent on the 1st of each month with 30-day score deltas.' },
                { id: 'off', title: 'Digest Disabled', desc: 'No periodic emails will be sent. In-app alerts remain active.' }
              ].map(opt => (
                <label
                  key={opt.id}
                  onClick={() => handleSavePreferences(opt.id as 'weekly' | 'monthly' | 'off', inAppToggle, pushToggle)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: digestFreq === opt.id ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface-elevated)',
                    border: `1px solid ${digestFreq === opt.id ? 'var(--emerald)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <input
                    type="radio"
                    name="digestFreq"
                    checked={digestFreq === opt.id}
                    onChange={() => {}}
                    style={{ marginTop: '3px', accentColor: 'var(--emerald)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                      {opt.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {opt.desc}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* In-App and Push Notification Toggles */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(6, 182, 212, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--cyan)'
              }}>
                <Smartphone size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Real-Time Channels</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Due medication reminders and immediate critical lab alerts
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* In-App Switch */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>In-App Notification Center</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Displays unread alerts in header panel</div>
                </div>
                <input
                  type="checkbox"
                  checked={inAppToggle}
                  onChange={e => handleSavePreferences(digestFreq, e.target.checked, pushToggle)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--emerald)', cursor: 'pointer' }}
                />
              </div>

              {/* Push Switch */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Browser Push Notifications</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Real-time alerts for scheduled medication doses</div>
                </div>
                <input
                  type="checkbox"
                  checked={pushToggle}
                  onChange={e => handleSavePreferences(digestFreq, inAppToggle, e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--emerald)', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={handleTriggerSimulatedPush}
                className="btn btn-secondary btn-sm"
                style={{ gap: '6px' }}
              >
                <Send size={13} />
                <span>Test Web Push Notification</span>
              </button>
              {sendTestStatus && (
                <span style={{ fontSize: '0.75rem', color: 'var(--emerald)', fontWeight: 600 }}>
                  ✓ {sendTestStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Email Digest Mockup */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-normal" style={{ fontSize: '0.7rem' }}>
                <Sparkles size={11} /> Live Preview
              </span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Synthesized HTML Email Digest</h3>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>To: {store.account.email}</span>
          </div>

          {/* Email Container Mockup */}
          <div style={{
            background: '#0f172a',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
            fontFamily: 'var(--font-sans)',
            color: '#f8fafc'
          }}>
            {/* Email Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0f766e, #065f46)',
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                  HealthSpan Weekly Digest
                </div>
                <div style={{ fontSize: '0.72rem', color: '#a7f3d0' }}>
                  Issue #34 &bull; Aug 22, 2026
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#e6fffa', marginTop: '4px' }}>
                Prepared for {store.profile.fullName}
              </div>
            </div>

            {/* Email Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Score Highlight Box */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Current Health Score
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', lineHeight: 1.1, marginTop: '4px' }}>
                    {scoreData.overallScore} / 100
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px' }}>
                    Grade: <strong>{scoreData.scoreGrade}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>Lab Biomarkers: <strong style={{ color: '#fff' }}>{scoreData.labBiomarkersScore}/100</strong></div>
                  <div>Body Metrics: <strong style={{ color: '#fff' }}>{scoreData.bodyMetricsScore}/100</strong></div>
                  <div>Lifestyle Habits: <strong style={{ color: '#fff' }}>{scoreData.lifestyleScore}/100</strong></div>
                </div>
              </div>

              {/* Primary Insight Box */}
              {topInsight && (
                <div style={{
                  background: topInsight.severity === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  border: `1px solid ${topInsight.severity === 'critical' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '14px'
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: topInsight.severity === 'critical' ? '#f87171' : '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} /> Top Priority Action: {topInsight.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '6px', lineHeight: 1.4 }}>
                    {topInsight.finding}
                  </div>
                </div>
              )}

              {/* Missing Data Reminders */}
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
                <strong style={{ color: '#f1f5f9' }}>Missing Data Reminders:</strong>
                <ul style={{ paddingLeft: '16px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <li>Log waist circumference for this week.</li>
                  <li>Verify scheduled 20:00 Metformin dose intake.</li>
                </ul>
              </div>

              {/* Email Footer & Easy Unsubscribe */}
              <div style={{
                fontSize: '0.7rem',
                color: '#64748b',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>HealthSpan Analytics &bull; Tenant: enterprise-01</span>
                <span style={{ textDecoration: 'underline', cursor: 'pointer', color: '#94a3b8' }}>
                  Change Digest Frequency / Unsubscribe
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
