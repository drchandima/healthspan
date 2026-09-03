'use client';

import React, { useState } from 'react';
import { DietRecord, UserProfile, BodyMetricRecord } from '@/lib/types';
import { calculateCalorieTarget } from '@/lib/referenceRanges';
import { Utensils, Plus, Wine, Cigarette, Flame, Calculator, CheckCircle2, AlertTriangle, Edit2, Trash2 } from 'lucide-react';

interface DietTrackerProps {
  dietRecords: DietRecord[];
  profile: UserProfile;
  latestBodyMetric?: BodyMetricRecord;
  onAddDiet: (record: Omit<DietRecord, 'id'>) => void;
  onUpdateDiet?: (id: string, updates: Partial<DietRecord>, reason: string) => void;
  onDeleteDiet?: (id: string, reason: string) => void;
}

export default function DietTracker({
  dietRecords,
  profile,
  latestBodyMetric,
  onAddDiet,
  onUpdateDiet,
  onDeleteDiet
}: DietTrackerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mealType, setMealType] = useState<DietRecord['mealType']>('Lunch');
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState<number>(550);
  const [proteinGrams, setProteinGrams] = useState<number>(35);
  const [carbsGrams, setCarbsGrams] = useState<number>(50);
  const [fatGrams, setFatGrams] = useState<number>(18);
  const [alcoholUnits, setAlcoholUnits] = useState<number>(0);
  const [cigarettesCount, setCigarettesCount] = useState<number>(0);

  const [editingRecord, setEditingRecord] = useState<DietRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState('Corrected meal details/calories');
  const [deleteReason, setDeleteReason] = useState('Duplicate meal entry');

  // Age calculation
  const birthYear = profile.dob ? new Date(profile.dob).getFullYear() : 1982;
  const age = new Date().getFullYear() - birthYear;
  const currentWeight = latestBodyMetric?.weightKg || profile.baselineBiometrics.initialWeightKg;
  const currentHeight = latestBodyMetric?.heightCm || profile.baselineBiometrics.initialHeightCm;

  const { bmr, tdee, target } = calculateCalorieTarget(currentWeight, currentHeight, age, profile.gender);

  // Today's summary
  const todayRecords = dietRecords.slice(-4);
  const totalCaloriesLogged = todayRecords.reduce((acc, d) => acc + d.calories, 0);
  const totalAlcoholUnits = dietRecords.reduce((acc, d) => acc + (d.alcoholUnits || 0), 0);
  const totalCigarettes = dietRecords.reduce((acc, d) => acc + (d.cigarettesCount || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;

    onAddDiet({
      timestamp: new Date().toISOString(),
      mealType,
      description,
      calories: Number(calories),
      proteinGrams: Number(proteinGrams) || undefined,
      carbsGrams: Number(carbsGrams) || undefined,
      fatGrams: Number(fatGrams) || undefined,
      alcoholUnits: Number(alcoholUnits) || undefined,
      cigarettesCount: Number(cigarettesCount) || undefined
    });

    setIsModalOpen(false);
    setDescription('');
    setAlcoholUnits(0);
    setCigarettesCount(0);
  };

  const handleConfirmEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !onUpdateDiet) return;
    onUpdateDiet(editingRecord.id, editingRecord, editReason);
    setEditingRecord(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetId || !onDeleteDiet) return;
    onDeleteDiet(deleteTargetId, deleteReason);
    setDeleteTargetId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Clinical Calorie Target & Consumption Grid */}
      <div className="grid-3">
        {/* Dynamic Calorie Target Calculator Card */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={18} style={{ color: 'var(--cyan)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Daily Calorie Target (Mifflin-St Jeor)</span>
            </div>
            <span className="badge badge-normal" style={{ fontSize: '0.68rem' }}>Automated</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="mono-num" style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {target}
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>kcal / day</span>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
            Based on: <strong>{age}y {profile.gender}</strong>, <strong>{currentWeight}kg</strong>, <strong>{currentHeight}cm</strong> &bull; BMR: {bmr} kcal
          </div>
        </div>

        {/* Alcohol & Tobacco Risk Monitor */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Substance & Toxicity Monitor</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wine size={18} style={{ color: totalAlcoholUnits > 7 ? 'var(--amber)' : 'var(--emerald)' }} />
              <div>
                <div className="mono-num" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {totalAlcoholUnits} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>units</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Alcohol Logged</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cigarette size={18} style={{ color: totalCigarettes > 0 ? 'var(--critical)' : 'var(--emerald)' }} />
              <div>
                <div className="mono-num" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {totalCigarettes} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>cigs</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Smoking Count</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.7rem', color: totalCigarettes > 0 ? 'var(--critical)' : 'var(--emerald)', marginTop: '2px' }}>
            {totalCigarettes > 0 ? '⚠️ Active smoking flags cardiovascular risk' : '✓ Tobacco-free status active'}
          </div>
        </div>

        {/* Log Meal Action Card */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
            style={{ width: '100%', gap: '8px' }}
          >
            <Plus size={16} />
            <span>Log Meal & Calories</span>
          </button>
        </div>
      </div>

      {/* Meal History Table */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Diet, Meals & Macronutrients History</h3>
          <span className="badge badge-normal">{dietRecords.length} Logged Entries</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Meal Type</th>
                <th style={{ padding: '10px 12px' }}>Description</th>
                <th style={{ padding: '10px 12px' }}>Calories</th>
                <th style={{ padding: '10px 12px' }}>Macros (P / C / F)</th>
                <th style={{ padding: '10px 12px' }}>Alcohol / Smoking</th>
                <th style={{ padding: '10px 12px' }}>Timestamp</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...dietRecords].reverse().map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '12px' }}>
                    <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
                      {d.mealType}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {d.description}
                  </td>
                  <td className="mono-num" style={{ padding: '12px', fontWeight: 700, color: 'var(--emerald)' }}>
                    {d.calories} kcal
                  </td>
                  <td className="mono-num" style={{ padding: '12px', color: 'var(--text-dim)' }}>
                    {d.proteinGrams || 0}g P &bull; {d.carbsGrams || 0}g C &bull; {d.fatGrams || 0}g F
                  </td>
                  <td style={{ padding: '12px' }}>
                    {(d.alcoholUnits || 0) > 0 && (
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem', marginRight: '4px' }}>
                        {d.alcoholUnits} Alcohol Unit(s)
                      </span>
                    )}
                    {(d.cigarettesCount || 0) > 0 && (
                      <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
                        {d.cigarettesCount} Cig(s)
                      </span>
                    )}
                    {!d.alcoholUnits && !d.cigarettesCount && (
                      <span style={{ color: 'var(--text-dim)' }}>—</span>
                    )}
                  </td>
                  <td className="mono-num" style={{ padding: '12px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                    {new Date(d.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => setEditingRecord({ ...d })}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px' }}
                        title="Edit record (with audit trail)"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(d.id)}
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
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem' }}>Log Meal & Nutritional Intake</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Meal Type</label>
                    <select
                      className="form-select"
                      value={mealType}
                      onChange={e => setMealType(e.target.value as DietRecord['mealType'])}
                    >
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                      <option value="Snack">Snack</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estimated Calories (kcal)</label>
                    <input
                      type="number"
                      className="form-input mono-num"
                      value={calories}
                      onChange={e => setCalories(parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Meal Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Grilled salmon, brown rice, and steamed asparagus"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                  />
                </div>

                {/* Macros */}
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Protein (g)</label>
                    <input
                      type="number"
                      className="form-input mono-num"
                      value={proteinGrams}
                      onChange={e => setProteinGrams(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Carbs (g)</label>
                    <input
                      type="number"
                      className="form-input mono-num"
                      value={carbsGrams}
                      onChange={e => setCarbsGrams(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fat (g)</label>
                    <input
                      type="number"
                      className="form-input mono-num"
                      value={fatGrams}
                      onChange={e => setFatGrams(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Alcohol & Smoking */}
                <div className="grid-2" style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Wine size={14} style={{ color: 'var(--amber)' }} />
                      <span>Alcohol Units (Drinks)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input mono-num"
                      value={alcoholUnits}
                      onChange={e => setAlcoholUnits(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Cigarette size={14} style={{ color: 'var(--critical)' }} />
                      <span>Cigarettes Smoked</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input mono-num"
                      value={cigarettesCount}
                      onChange={e => setCigarettesCount(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Diet Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRecord && (
        <div className="modal-overlay" onClick={() => setEditingRecord(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem' }}>Edit Meal Record</h3>
              <button onClick={() => setEditingRecord(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleConfirmEdit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Meal Type</label>
                    <select
                      className="form-select"
                      value={editingRecord.mealType}
                      onChange={e => setEditingRecord({ ...editingRecord, mealType: e.target.value as DietRecord['mealType'] })}
                    >
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                      <option value="Snack">Snack</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Calories (kcal)</label>
                    <input
                      type="number"
                      className="form-input mono-num"
                      value={editingRecord.calories}
                      onChange={e => setEditingRecord({ ...editingRecord, calories: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Meal Description</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingRecord.description}
                    onChange={e => setEditingRecord({ ...editingRecord, description: e.target.value })}
                    required
                  />
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Protein (g)</label>
                    <input
                      type="number"
                      className="form-input mono-num"
                      value={editingRecord.proteinGrams || 0}
                      onChange={e => setEditingRecord({ ...editingRecord, proteinGrams: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Carbs (g)</label>
                    <input
                      type="number"
                      className="form-input mono-num"
                      value={editingRecord.carbsGrams || 0}
                      onChange={e => setEditingRecord({ ...editingRecord, carbsGrams: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fat (g)</label>
                    <input
                      type="number"
                      className="form-input mono-num"
                      value={editingRecord.fatGrams || 0}
                      onChange={e => setEditingRecord({ ...editingRecord, fatGrams: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid-2" style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Wine size={14} style={{ color: 'var(--amber)' }} />
                      <span>Alcohol Units</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input mono-num"
                      value={editingRecord.alcoholUnits || 0}
                      onChange={e => setEditingRecord({ ...editingRecord, alcoholUnits: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Cigarette size={14} style={{ color: 'var(--critical)' }} />
                      <span>Cigarettes</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input mono-num"
                      value={editingRecord.cigarettesCount || 0}
                      onChange={e => setEditingRecord({ ...editingRecord, cigarettesCount: parseInt(e.target.value) || 0 })}
                    />
                  </div>
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
              <h3 style={{ fontSize: '1.1rem', color: 'var(--critical)' }}>Delete Meal Record</h3>
              <button onClick={() => setDeleteTargetId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Are you sure you want to delete this meal log? An immutable audit log entry will be created.
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
