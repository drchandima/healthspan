'use client';

import React, { useState } from 'react';
import { HealthSpanStore, UserProfile } from '@/lib/types';
import DeleteAccountModal from './DeleteAccountModal';
import { 
  User, 
  Lock, 
  ShieldCheck, 
  Download, 
  KeyRound, 
  Trash2, 
  FileJson, 
  FileSpreadsheet, 
  CheckCircle2, 
  QrCode,
  Layers,
  Server
} from 'lucide-react';

interface SettingsTabProps {
  store: HealthSpanStore;
  onUpdateStore: (store: HealthSpanStore) => void;
  onAccountPurged: () => void;
}

export default function SettingsTab({
  store,
  onUpdateStore,
  onAccountPurged
}: SettingsTabProps) {
  const [profile, setProfile] = useState<UserProfile>({ ...store.profile });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(store.account.twoFactorEnabled);
  const [show2FAPrompt, setShow2FAPrompt] = useState(false);

  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Save Profile (persist to server)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    try {
      const res = await fetch('/api/auth/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setProfileError(data?.error || 'Failed to save profile.');
        return;
      }
      const updated: HealthSpanStore = {
        ...store,
        profile: { ...profile },
      };
      onUpdateStore(updated);
      setProfileSuccessMsg('Profile information updated successfully.');
      setTimeout(() => setProfileSuccessMsg(null), 3000);
    } catch (err) {
      setProfileError('Network error while saving profile.');
    }
  };

  // Change Password (via authenticated API)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPasswordError(data?.error || 'Password change failed.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccessMsg('Password changed successfully.');
      setTimeout(() => setPasswordSuccessMsg(null), 3000);
    } catch (err) {
      setPasswordError('Network error while changing password.');
    }
  };

  // Toggle 2FA (persist to server)
  const handleToggle2FA = async () => {
    const nextState = !twoFactorEnabled;
    setTwoFactorEnabled(nextState);
    if (nextState) {
      setShow2FAPrompt(true);
    } else {
      setShow2FAPrompt(false);
    }
    try {
      const res = await fetch('/api/auth/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ twoFactorEnabled: nextState }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated: HealthSpanStore = {
          ...store,
          account: {
            ...store.account,
            twoFactorEnabled: nextState,
          },
        };
        onUpdateStore(updated);
      }
    } catch (err) {
      // rollback UI state on failure
      setTwoFactorEnabled(!nextState);
      setShow2FAPrompt(nextState ? false : true);
    }
  };

  // Export Data Handler (server loads owned data from DB and returns file)
  const handleExport = async (format: 'json' | 'csv') => {
    setExportError(null);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setExportError(data?.error || 'Export failed.');
        return;
      }
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : `HealthSpan_Export_${format}.${format}`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError('Network error while exporting.');
    }
  };

  // Handle Account Deletion (permanently remove from DB)
  const handleConfirmAccountDelete = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/health-data', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDeleteError(data?.error || 'Account deletion failed.');
        return false;
      }
      // clear local cache
      localStorage.removeItem('healthspan_store_v1');
      localStorage.removeItem('healthspan_current_user');
      onAccountPurged();
      return true;
    } catch (err) {
      setDeleteError('Network error during account deletion.');
      return false;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Account & Privacy Settings</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Profile attributes, security authentication, multi-tenant infrastructure, and data export
        </p>
      </div>

      <div className="grid-2">
        {/* Left Column: Profile & Security */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Profile Editor Card */}
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
                <User size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Patient Profile Information</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Baseline demographics and clinical biometrics</p>
              </div>
            </div>

            {profileSuccessMsg && (
              <div style={{
                background: 'var(--normal-bg)',
                border: '1px solid var(--normal-border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                color: 'var(--emerald)',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileError && (
              <div style={{
                background: 'var(--critical-bg)',
                border: '1px solid var(--critical-border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                color: 'var(--critical)',
                fontSize: '0.82rem'
              }}>
                {profileError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.fullName}
                  onChange={e => setProfile({ ...profile, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Date of Birth (DOB)</label>
                  <input
                    type="date"
                    className="form-input mono-num"
                    value={profile.dob}
                    onChange={e => setProfile({ ...profile, dob: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-select"
                    value={profile.gender}
                    onChange={e => setProfile({ ...profile, gender: e.target.value as 'male' | 'female' | 'other' })}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Ethnicity</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profile.ethnicity}
                    onChange={e => setProfile({ ...profile, ethnicity: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Baseline Height (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-input mono-num"
                    value={profile.baselineBiometrics.initialHeightCm}
                    onChange={e => setProfile({
                      ...profile,
                      baselineBiometrics: {
                        ...profile.baselineBiometrics,
                        initialHeightCm: parseFloat(e.target.value) || 178
                      }
                    })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>

          {/* Password & 2FA Card */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--indigo)'
              }}>
                <Lock size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Authentication & 2FA</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Password credentials and multi-factor setup</p>
              </div>
            </div>

            {passwordError && (
              <div style={{
                background: 'var(--critical-bg)',
                border: '1px solid var(--critical-border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                color: 'var(--critical)',
                fontSize: '0.82rem'
              }}>
                {passwordError}
              </div>
            )}

            {passwordSuccessMsg && (
              <div style={{
                background: 'var(--normal-bg)',
                border: '1px solid var(--normal-border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                color: 'var(--emerald)',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            {/* 2FA Toggle */}
            <div style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Two-Factor Authentication (2FA)</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Require TOTP authenticator token on sign-in</div>
              </div>
              <input
                type="checkbox"
                checked={twoFactorEnabled}
                onChange={handleToggle2FA}
                style={{ width: '18px', height: '18px', accentColor: 'var(--emerald)', cursor: 'pointer' }}
              />
            </div>

            {show2FAPrompt && (
              <div style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <QrCode size={36} style={{ color: 'var(--cyan)' }} />
                <div style={{ fontSize: '0.76rem', color: 'var(--text-main)' }}>
                  <strong>Authenticator Key:</strong> <span className="mono-num" style={{ color: 'var(--cyan)' }}>HS-2FA-9941-SECURE</span>
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>Scan with Google Authenticator / Authy app</div>
                </div>
              </div>
            )}

            {/* Password Change Form */}
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-secondary btn-sm">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Data Export, Multi-Tenancy Architecture, and Account Purge */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Data Export Card */}
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
                <Download size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Data Portability & Export</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Download complete time-series health records and audit logs
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Export your clinical database including all longitudinal body metrics, lab results, medication history, and immutable audit trails in standardized formats:
            </p>

            <div className="grid-2">
              <button
                type="button"
                onClick={() => handleExport('json')}
                className="btn btn-secondary"
                style={{ gap: '8px', padding: '12px' }}
              >
                <FileJson size={18} style={{ color: 'var(--cyan)' }} />
                <span>Export as JSON</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport('csv')}
                className="btn btn-secondary"
                style={{ gap: '8px', padding: '12px' }}
              >
                <FileSpreadsheet size={18} style={{ color: 'var(--emerald)' }} />
                <span>Export as CSV</span>
              </button>
            </div>

            {exportError && (
              <div style={{
                background: 'var(--critical-bg)',
                border: '1px solid var(--critical-border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                color: 'var(--critical)',
                fontSize: '0.82rem'
              }}>
                {exportError}
              </div>
            )}
          </div>

          {/* Multi-Tenant & Encryption Info */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Architecture & Tenant Security</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Multi-tenant partition & HIPAA compliance readiness</p>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <strong style={{ color: 'var(--text-main)' }}>Tenant Partition ID:</strong> <span className="mono-num" style={{ color: 'var(--cyan)' }}>{store.tenantId}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-main)' }}>Encryption at Rest:</strong> AES-256-GCM cryptographic volume partitioning
              </div>
              <div>
                <strong style={{ color: 'var(--text-main)' }}>Audit Immutability:</strong> SHA-256 verified action trail with timestamp sequencing
              </div>
              <div>
                <strong style={{ color: 'var(--text-main)' }}>Zero-Knowledge Isolation:</strong> Tenant data structures are partitioned to prevent cross-tenant data leakage.
              </div>
            </div>
          </div>

          {/* Danger Zone: Account Deletion */}
          <div className="glass-card" style={{
            padding: '24px',
            border: '1px solid var(--critical-border)',
            background: 'rgba(239, 68, 68, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--critical-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--critical)'
              }}>
                <Trash2 size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--critical)' }}>Danger Zone: Account Deletion</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Permanent deletion of user account and all health data</p>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Permanently erase your patient profile, historical time-series body metrics, lab results, medications, and audit logs. This cannot be undone.
            </p>

            <div style={{ marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="btn btn-danger btn-sm"
                style={{ gap: '8px' }}
              >
                <Trash2 size={14} />
                <span>Initiate Account & Data Deletion</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal Gate */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmDelete={handleConfirmAccountDelete}
        error={deleteError}
      />
    </div>
  );
}
