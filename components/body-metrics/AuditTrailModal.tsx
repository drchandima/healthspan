'use client';

import React, { useState } from 'react';
import { AuditTrailRecord } from '@/lib/types';
import { History, X, ShieldAlert, Filter, ArrowRight } from 'lucide-react';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditTrail: AuditTrailRecord[];
}

export default function AuditTrailModal({ isOpen, onClose, auditTrail }: AuditTrailModalProps) {
  const [filterType, setFilterType] = useState<string>('all');

  if (!isOpen) return null;

  const filtered = filterType === 'all' 
    ? auditTrail 
    : auditTrail.filter(a => a.entityType === filterType);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <span className="badge badge-normal" style={{ fontSize: '0.68rem' }}>CREATE</span>;
      case 'UPDATE':
        return <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>UPDATE</span>;
      case 'DELETE':
        return <span className="badge badge-critical" style={{ fontSize: '0.68rem' }}>DELETE</span>;
      default:
        return <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>{action}</span>;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--indigo), var(--cyan))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <History size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>EHR Security & Audit Trail</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Immutable historical ledger of modifications, creations, and deletions
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filter Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={13} /> Filter:
            </span>
            {['all', 'bodyMetrics', 'labResults', 'lifestyle', 'medication'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`btn btn-sm ${filterType === type ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px', textTransform: 'capitalize' }}
              >
                {type === 'all' ? 'All Records' : type}
              </button>
            ))}
          </div>

          {/* Audit Logs List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No audit entries match the selected filter.
              </div>
            ) : (
              filtered.map(entry => (
                <div
                  key={entry.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getActionBadge(entry.action)}
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {entry.summary}
                      </span>
                    </div>
                    <span className="mono-num" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {entry.reason && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      <strong>Reason:</strong> {entry.reason}
                    </div>
                  )}

                  {/* Previous vs New Diff Preview */}
                  {Boolean(entry.previousValue || entry.newValue) && (
                    <div style={{
                      marginTop: '4px',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.25)',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      overflowX: 'auto'
                    }}>
                      {Boolean(entry.previousValue) && (
                        <span>PREV: {JSON.stringify(entry.previousValue).slice(0, 70)}...</span>
                      )}
                      {Boolean(entry.previousValue && entry.newValue) && <ArrowRight size={12} />}
                      {Boolean(entry.newValue) && (
                        <span style={{ color: 'var(--emerald)' }}>NEW: {JSON.stringify(entry.newValue).slice(0, 70)}...</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
}
