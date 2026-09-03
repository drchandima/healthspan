'use client';

import React, { useState } from 'react';
import { HealthSpanStore, LabResultRecord, LabPanelType } from '@/lib/types';
import { addLabResult, batchAddLabResults, updateLabResult, deleteLabResult } from '@/lib/storage';
import { classifyLabResult } from '@/lib/referenceRanges';
import LabResultsTable from './LabResultsTable';
import LabTimeSeriesChart from './LabTimeSeriesChart';
import ManualLabEntryModal from './ManualLabEntryModal';
import OcrUploadModal from './OcrUploadModal';
import { FlaskConical, UploadCloud, PlusCircle, Sparkles, ShieldCheck, Activity, Droplets, HeartPulse, Stethoscope, TestTube2, LucideIcon } from 'lucide-react';

interface LabResultsTabProps {
  store: HealthSpanStore;
  onUpdateStore: (store: HealthSpanStore) => void;
}

export default function LabResultsTab({ store, onUpdateStore }: LabResultsTabProps) {
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);

  // 5 customizable buttons initialized to requested order:
  // 1: Hemoglobin, 2: Fasting Blood Sugar, 3: Total Cholesterol, 4: Renal Functions (S/Cr), 5: Liver Functions (AST/ALT)
  const [panelConfigs, setPanelConfigs] = useState<Array<{
    title: string;
    biomarker: string;
    panel: LabPanelType;
    icon: LucideIcon;
    color: string;
    options: string[];
  }>>([
    {
      title: 'Hemoglobin',
      biomarker: 'Hemoglobin',
      panel: 'Hemoglobin',
      icon: TestTube2,
      color: '#ec4899',
      options: ['Hemoglobin', 'Hematocrit', 'Red Blood Cell (RBC)']
    },
    {
      title: 'Fasting Blood Sugar',
      biomarker: 'Fasting Blood Sugar',
      panel: 'Blood Sugar',
      icon: Activity,
      color: '#06b6d4',
      options: ['Fasting Blood Sugar', 'HbA1c', 'Postprandial Glucose']
    },
    {
      title: 'Total Cholesterol',
      biomarker: 'Total Cholesterol',
      panel: 'Lipid Panel',
      icon: HeartPulse,
      color: '#f59e0b',
      options: ['Total Cholesterol', 'LDL Cholesterol', 'HDL Cholesterol', 'Triglycerides']
    },
    {
      title: 'Renal Functions (S/Cr)',
      biomarker: 'Serum Creatinine (S/Cr)',
      panel: 'Renal Function',
      icon: Droplets,
      color: '#6366f1',
      options: ['Serum Creatinine (S/Cr)', 'eGFR', 'Blood Urea Nitrogen (BUN)']
    },
    {
      title: 'Liver Functions (AST, ALT)',
      biomarker: 'ALT (SGPT)',
      panel: 'Liver Function',
      icon: Stethoscope,
      color: '#10b981',
      options: ['ALT (SGPT)', 'AST (SGOT)', 'Total Bilirubin']
    }
  ]);

  const [selectedBiomarker, setSelectedBiomarker] = useState<string>('Hemoglobin');

  const { labResults } = store.timeSeries;

  const handleSaveManualLab = (record: Omit<LabResultRecord, 'id'>) => {
    const updated = addLabResult(store, record);
    onUpdateStore(updated);
  };

  const handleUpdateLab = (id: string, updates: Partial<LabResultRecord>, reason: string) => {
    if (updates.value !== undefined && updates.testName) {
      const classification = classifyLabResult(updates.testName, updates.value);
      updates.status = classification.status;
    }
    const updated = updateLabResult(store, id, updates, reason);
    onUpdateStore(updated);
  };

  const handleDeleteLab = (id: string, reason: string) => {
    const updated = deleteLabResult(store, id, reason);
    onUpdateStore(updated);
  };

  const handleConfirmOcrBatch = (records: Omit<LabResultRecord, 'id'>[]) => {
    const updated = batchAddLabResults(store, records);
    onUpdateStore(updated);
  };

  const handleCardBiomarkerChange = (cardIndex: number, newBiomarker: string) => {
    const updatedConfigs = [...panelConfigs];
    updatedConfigs[cardIndex] = {
      ...updatedConfigs[cardIndex],
      biomarker: newBiomarker
    };
    setPanelConfigs(updatedConfigs);
    setSelectedBiomarker(newBiomarker);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Clinical Lab Biomarkers & Diagnostics</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Track longitudinal panels: Hemoglobin, Glycemic, Lipids, Renal (S/Cr), and Liver (AST/ALT)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="btn btn-secondary"
            style={{ gap: '8px' }}
          >
            <PlusCircle size={16} />
            <span>Manual Entry</span>
          </button>
          <button
            onClick={() => setIsOcrModalOpen(true)}
            className="btn btn-primary"
            style={{ gap: '8px' }}
          >
            <Sparkles size={16} />
            <span>AI OCR Lab Ingest</span>
          </button>
        </div>
      </div>

      {/* Clickable Panel Cards Grid with on-demand Biomarker Customizer */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px'
      }}>
        {panelConfigs.map((p, index) => {
          const Icon = p.icon;
          const records = labResults.filter(r => r.testName === p.biomarker);
          const latest = records[records.length - 1];
          const isSelected = selectedBiomarker === p.biomarker;

          return (
            <div
              key={p.title}
              onClick={() => setSelectedBiomarker(p.biomarker)}
              className={`metric-card ${isSelected ? 'selected' : ''}`}
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: isSelected ? '2px solid var(--cyan)' : 'none',
                background: isSelected ? 'rgba(6, 182, 212, 0.08)' : undefined,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {p.title}
                  </span>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    background: `${p.color}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: p.color
                  }}>
                    <Icon size={15} />
                  </div>
                </div>

                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span className="mono-num" style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: latest?.status === 'critical' ? 'var(--critical)' : latest?.status === 'borderline' ? 'var(--amber)' : 'var(--emerald)'
                  }}>
                    {latest ? latest.value : '—'}
                  </span>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {latest?.unit || ''}
                  </span>
                </div>
              </div>

              {/* Biomarker Selector Dropdown to change biomarker on demand */}
              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Biomarker:
                  </span>
                  {latest && (
                    <span className={`badge ${latest.status === 'normal' ? 'badge-normal' : latest.status === 'borderline' ? 'badge-warning' : 'badge-critical'}`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                      {latest.status.toUpperCase()}
                    </span>
                  )}
                </div>

                <select
                  value={p.biomarker}
                  onChange={e => handleCardBiomarkerChange(index, e.target.value)}
                  className="form-select"
                  style={{
                    fontSize: '0.73rem',
                    padding: '3px 8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'var(--border-subtle)',
                    cursor: 'pointer'
                  }}
                  title="Click to switch this card to a different biomarker"
                >
                  {p.options.map(opt => (
                    <option key={opt} value={opt} style={{ background: '#0f172a', color: '#fff' }}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Trend Chart */}
      <LabTimeSeriesChart
        labResults={labResults}
        selectedBiomarker={selectedBiomarker}
        onSelectBiomarker={setSelectedBiomarker}
      />

      {/* Main Grouped Lab Results Table */}
      <LabResultsTable 
        labResults={labResults}
        onUpdateRecord={handleUpdateLab}
        onDeleteRecord={handleDeleteLab}
      />

      {/* Manual Entry Modal */}
      <ManualLabEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSave={handleSaveManualLab}
      />

      {/* OCR Drag-and-Drop Scanner Modal */}
      <OcrUploadModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onConfirmBatch={handleConfirmOcrBatch}
      />
    </div>
  );
}
