'use client';

import React, { useState } from 'react';
import { Trash2, AlertOctagon, X } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<boolean>;
  error?: string | null;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirmDelete,
  error
}: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const isGatePassed = confirmText === 'DELETE';

  const handleDelete = async () => {
    if (!isGatePassed) return;
    setIsDeleting(true);
    const ok = await onConfirmDelete();
    setIsDeleting(false);
    if (ok) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', border: '1px solid var(--critical-border)' }}>
        <div className="modal-header">
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
              <AlertOctagon size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--critical)' }}>Permanent Account & EHR Deletion</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Irreversible data purge action</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: 'var(--critical-bg)',
            border: '1px solid var(--critical-border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            fontSize: '0.84rem',
            color: '#fca5a5',
            lineHeight: 1.45
          }}>
            <strong>WARNING:</strong> This action will permanently purge all longitudinal time-series records, lab diagnostic reports, prescription regimens, lifestyle logs, and the immutable audit trail for this patient account from the database.
          </div>

          {error && (
            <div style={{
              background: 'var(--critical-bg)',
              border: '1px solid var(--critical-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              color: 'var(--critical)',
              fontSize: '0.82rem'
            }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
              To confirm, type <span style={{ color: 'var(--critical)', letterSpacing: '0.05em' }}>DELETE</span> in all caps:
            </label>
            <input
              type="text"
              className="form-input mono-num"
              placeholder="Type DELETE"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              style={{
                borderColor: isGatePassed ? 'var(--critical)' : 'var(--border-subtle)',
                fontWeight: 700
              }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={!isGatePassed || isDeleting}
            onClick={handleDelete}
          >
            <Trash2 size={16} />
            <span>{isDeleting ? 'Purging All Data...' : 'Permanently Delete Account & Data'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
