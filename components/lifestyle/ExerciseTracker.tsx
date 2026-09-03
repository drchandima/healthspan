'use client';

import React, { useState } from 'react';
import { ExerciseRecord } from '@/lib/types';
import { Dumbbell, Plus, Flame, Clock, Trophy, Target, Edit2, Trash2 } from 'lucide-react';

interface ExerciseTrackerProps {
  exerciseRecords: ExerciseRecord[];
  onAddExercise: (record: Omit<ExerciseRecord, 'id'>) => void;
  onUpdateExercise?: (id: string, updates: Partial<ExerciseRecord>, reason: string) => void;
  onDeleteExercise?: (id: string, reason: string) => void;
}

export default function ExerciseTracker({ exerciseRecords, onAddExercise, onUpdateExercise, onDeleteExercise }: ExerciseTrackerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activityType, setActivityType] = useState<ExerciseRecord['activityType']>('Cardio');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [intensity, setIntensity] = useState<'Low' | 'Moderate' | 'High'>('Moderate');
  const [caloriesBurned, setCaloriesBurned] = useState<number>(240);
  const [notes, setNotes] = useState('');

  const [editingRecord, setEditingRecord] = useState<ExerciseRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState('Corrected exercise session');
  const [deleteReason, setDeleteReason] = useState('Duplicate workout entry');

  const recent = exerciseRecords.slice(-7);
  const totalWeeklyMins = recent.reduce((acc, e) => acc + e.durationMinutes, 0);
  const totalWeeklyCalories = recent.reduce((acc, e) => acc + (e.caloriesBurned || 0), 0);
  const weeklyTargetMins = 150;
  const progressPercent = Math.min(100, Math.round((totalWeeklyMins / weeklyTargetMins) * 100));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddExercise({
      timestamp: new Date().toISOString(),
      activityType,
      durationMinutes: Number(durationMinutes),
      intensity,
      caloriesBurned: Number(caloriesBurned) || undefined,
      notes: notes.trim() || undefined
    });
    setIsModalOpen(false);
    setNotes('');
  };

  const handleConfirmEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !onUpdateExercise) return;
    onUpdateExercise(editingRecord.id, editingRecord, editReason);
    setEditingRecord(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetId || !onDeleteExercise) return;
    onDeleteExercise(deleteTargetId, deleteReason);
    setDeleteTargetId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top summary grid */}
      <div className="grid-3">
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} style={{ color: 'var(--emerald)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Weekly Activity Target</span>
            </div>
            <span className="mono-num" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--emerald)' }}>
              {totalWeeklyMins} / {weeklyTargetMins} mins
            </span>
          </div>

          <div style={{
            width: '100%',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: progressPercent >= 100 ? 'var(--emerald)' : 'var(--cyan)',
              boxShadow: '0 0 8px rgba(6, 182, 212, 0.5)',
              transition: 'width 0.8s ease'
            }} />
          </div>

          <div style={{ fontSize: '0.72rem', color: totalWeeklyMins < 100 ? 'var(--amber)' : 'var(--emerald)' }}>
            {totalWeeklyMins < 100 ? '⚠️ Low physical activity volume' : '✓ On track for cardiovascular health'}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--amber)'
          }}>
            <Flame size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Weekly Energy Expenditure</div>
            <div className="mono-num" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {totalWeeklyCalories} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Across {recent.length} logged sessions</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
            style={{ width: '100%', gap: '8px' }}
          >
            <Plus size={16} />
            <span>Log Exercise Session</span>
          </button>
        </div>
      </div>

      {/* Exercise History Table */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Exercise & Workout Log</h3>
          <span className="badge badge-normal">{exerciseRecords.length} Workouts</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Timestamp</th>
                <th style={{ padding: '10px 12px' }}>Workout Type</th>
                <th style={{ padding: '10px 12px' }}>Duration</th>
                <th style={{ padding: '10px 12px' }}>Intensity</th>
                <th style={{ padding: '10px 12px' }}>Calories Burned</th>
                <th style={{ padding: '10px 12px' }}>Notes</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...exerciseRecords].reverse().map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td className="mono-num" style={{ padding: '12px', fontWeight: 600 }}>
                    {new Date(e.timestamp).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700 }}>
                    {e.activityType}
                  </td>
                  <td className="mono-num" style={{ padding: '12px' }}>
                    {e.durationMinutes} mins
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className={`badge ${e.intensity === 'High' ? 'badge-critical' : e.intensity === 'Moderate' ? 'badge-normal' : 'badge-info'}`} style={{ fontSize: '0.68rem' }}>
                      {e.intensity}
                    </span>
                  </td>
                  <td className="mono-num" style={{ padding: '12px', color: 'var(--amber)' }}>
                    {e.caloriesBurned ? `${e.caloriesBurned} kcal` : '—'}
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-dim)' }}>
                    {e.notes || '—'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => setEditingRecord({ ...e })}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px' }}
                        title="Edit record (with audit trail)"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(e.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', color: 'var(--critical)' }}
                        title="Delete record"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem' }}>Log Workout / Physical Activity</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Activity Type</label>
                  <select
                    className="form-select"
                    value={activityType}
                    onChange={e => setActivityType(e.target.value as ExerciseRecord['activityType'])}
                  >
                    <option value="Cardio">Cardio / Running</option>
                    <option value="Strength">Strength / Weight Training</option>
                    <option value="HIIT">HIIT / Circuit Training</option>
                    <option value="Walking">Brisk Walking</option>
                    <option value="Swimming">Swimming</option>
                    <option value="Cycling">Cycling / Spinning</option>
                    <option value="Yoga">Yoga / Mobility</option>
                    <option value="Other">Other Sport</option>
                  </select>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Duration (Minutes)</label>
                    <input
                      type="number"
                      className="form-input mono-num"
                      value={durationMinutes}
                      onChange={e => setDurationMinutes(parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Intensity</label>
                    <select
                      className="form-select"
                      value={intensity}
                      onChange={e => setIntensity(e.target.value as 'Low' | 'Moderate' | 'High')}
                    >
                      <option value="Low">Low (Zone 1-2)</option>
                      <option value="Moderate">Moderate (Zone 3)</option>
                      <option value="High">High (Zone 4-5)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Estimated Calories Burned (kcal)</label>
                  <input
                    type="number"
                    className="form-input mono-num"
                    value={caloriesBurned}
                    onChange={e => setCaloriesBurned(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 5km outdoors, heart rate avg 142 bpm"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Exercise Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRecord && (
        <div className="modal-overlay" onClick={() => setEditingRecord(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem' }}>Edit Exercise Session</h3>
              <button onClick={() => setEditingRecord(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleConfirmEdit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Activity Type</label>
                  <select
                    className="form-select"
                    value={editingRecord.activityType}
                    onChange={e => setEditingRecord({ ...editingRecord, activityType: e.target.value as ExerciseRecord['activityType'] })}
                  >
                    <option value="Cardio">Cardio / Running</option>
                    <option value="Strength">Strength / Weight Training</option>
                    <option value="HIIT">HIIT / Circuit Training</option>
                    <option value="Walking">Brisk Walking</option>
                    <option value="Swimming">Swimming</option>
                    <option value="Cycling">Cycling / Spinning</option>
                    <option value="Yoga">Yoga / Mobility</option>
                    <option value="Other">Other Sport</option>
                  </select>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Duration (Minutes)</label>
                    <input
                      type="number"
                      className="form-input mono-num"
                      value={editingRecord.durationMinutes}
                      onChange={e => setEditingRecord({ ...editingRecord, durationMinutes: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Intensity</label>
                    <select
                      className="form-select"
                      value={editingRecord.intensity}
                      onChange={e => setEditingRecord({ ...editingRecord, intensity: e.target.value as 'Low' | 'Moderate' | 'High' })}
                    >
                      <option value="Low">Low (Zone 1-2)</option>
                      <option value="Moderate">Moderate (Zone 3)</option>
                      <option value="High">High (Zone 4-5)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Estimated Calories Burned (kcal)</label>
                  <input
                    type="number"
                    className="form-input mono-num"
                    value={editingRecord.caloriesBurned || 0}
                    onChange={e => setEditingRecord({ ...editingRecord, caloriesBurned: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Audit Log Reason for Edit</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editReason}
                    onChange={e => setEditReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingRecord(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes & Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTargetId && (
        <div className="modal-overlay" onClick={() => setDeleteTargetId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', color: 'var(--critical)' }}>Delete Exercise Record</h3>
              <button onClick={() => setDeleteTargetId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Are you sure you want to delete this exercise log? An immutable audit log entry will be created.
              </p>
              <div className="form-group">
                <label className="form-label">Reason for Deletion</label>
                <input
                  type="text"
                  className="form-input"
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteTargetId(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleConfirmDelete}>Confirm Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
