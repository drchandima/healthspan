'use client';

import React, { useState } from 'react';
import { HealthSpanStore, SleepRecord, ExerciseRecord, DietRecord, MedicationRecord } from '@/lib/types';
import { 
  addSleepRecord, updateSleepRecord, deleteSleepRecord,
  addExerciseRecord, updateExerciseRecord, deleteExerciseRecord,
  addDietRecord, updateDietRecord, deleteDietRecord,
  addMedication, updateMedication, deleteMedication,
  markMedicationTaken 
} from '@/lib/storage';
import SleepTracker from './SleepTracker';
import ExerciseTracker from './ExerciseTracker';
import DietTracker from './DietTracker';
import MedicationTracker from './MedicationTracker';
import { Moon, Dumbbell, Utensils, Pill } from 'lucide-react';

interface LifestyleTabProps {
  store: HealthSpanStore;
  onUpdateStore: (store: HealthSpanStore) => void;
}

export default function LifestyleTab({ store, onUpdateStore }: LifestyleTabProps) {
  const [subTab, setSubTab] = useState<'sleep' | 'exercise' | 'diet' | 'medications'>('sleep');

  const { sleep, exercise, diet, medications } = store.timeSeries.lifestyle;
  const latestBody = store.timeSeries.bodyMetrics[store.timeSeries.bodyMetrics.length - 1];

  // Sleep Handlers
  const handleAddSleep = (record: Omit<SleepRecord, 'id'>) => {
    const updated = addSleepRecord(store, record);
    onUpdateStore(updated);
  };
  const handleUpdateSleep = (id: string, updates: Partial<SleepRecord>, reason: string) => {
    const updated = updateSleepRecord(store, id, updates, reason);
    onUpdateStore(updated);
  };
  const handleDeleteSleep = (id: string, reason: string) => {
    const updated = deleteSleepRecord(store, id, reason);
    onUpdateStore(updated);
  };

  // Exercise Handlers
  const handleAddExercise = (record: Omit<ExerciseRecord, 'id'>) => {
    const updated = addExerciseRecord(store, record);
    onUpdateStore(updated);
  };
  const handleUpdateExercise = (id: string, updates: Partial<ExerciseRecord>, reason: string) => {
    const updated = updateExerciseRecord(store, id, updates, reason);
    onUpdateStore(updated);
  };
  const handleDeleteExercise = (id: string, reason: string) => {
    const updated = deleteExerciseRecord(store, id, reason);
    onUpdateStore(updated);
  };

  // Diet Handlers
  const handleAddDiet = (record: Omit<DietRecord, 'id'>) => {
    const updated = addDietRecord(store, record);
    onUpdateStore(updated);
  };
  const handleUpdateDiet = (id: string, updates: Partial<DietRecord>, reason: string) => {
    const updated = updateDietRecord(store, id, updates, reason);
    onUpdateStore(updated);
  };
  const handleDeleteDiet = (id: string, reason: string) => {
    const updated = deleteDietRecord(store, id, reason);
    onUpdateStore(updated);
  };

  // Medication Handlers
  const handleAddMedication = (record: Omit<MedicationRecord, 'id'>) => {
    const updated = addMedication(store, record);
    onUpdateStore(updated);
  };
  const handleUpdateMedication = (id: string, updates: Partial<MedicationRecord>, reason: string) => {
    const updated = updateMedication(store, id, updates, reason);
    onUpdateStore(updated);
  };
  const handleDeleteMedication = (id: string, reason: string) => {
    const updated = deleteMedication(store, id, reason);
    onUpdateStore(updated);
  };
  const handleMarkMedicationTaken = (medId: string) => {
    const updated = markMedicationTaken(store, medId);
    onUpdateStore(updated);
  };

  const tabs = [
    { id: 'sleep', label: 'Sleep & Recovery', icon: Moon, count: sleep.length },
    { id: 'exercise', label: 'Exercise & Activity', icon: Dumbbell, count: exercise.length },
    { id: 'diet', label: 'Diet & Calorie Targets', icon: Utensils, count: diet.length },
    { id: 'medications', label: 'Medications & Adherence', icon: Pill, count: medications.length }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Lifestyle Tracking & Chronic Disease Management</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Continuous tracking of daily behavioral factors, metabolic targets, and medication compliance
        </p>
      </div>

      {/* Sub-Tabs Header */}
      <div className="tabs-header">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id as 'sleep' | 'exercise' | 'diet' | 'medications')}
              className={`tab-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{t.label}</span>
              <span className="badge" style={{
                background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                fontSize: '0.65rem',
                padding: '1px 6px',
                color: '#fff'
              }}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Subtab Contents */}
      {subTab === 'sleep' && (
        <SleepTracker
          sleepRecords={sleep}
          onAddSleep={handleAddSleep}
          onUpdateSleep={handleUpdateSleep}
          onDeleteSleep={handleDeleteSleep}
        />
      )}

      {subTab === 'exercise' && (
        <ExerciseTracker
          exerciseRecords={exercise}
          onAddExercise={handleAddExercise}
          onUpdateExercise={handleUpdateExercise}
          onDeleteExercise={handleDeleteExercise}
        />
      )}

      {subTab === 'diet' && (
        <DietTracker
          dietRecords={diet}
          profile={store.profile}
          latestBodyMetric={latestBody}
          onAddDiet={handleAddDiet}
          onUpdateDiet={handleUpdateDiet}
          onDeleteDiet={handleDeleteDiet}
        />
      )}

      {subTab === 'medications' && (
        <MedicationTracker
          medications={medications}
          onAddMedication={handleAddMedication}
          onMarkTaken={handleMarkMedicationTaken}
          onUpdateMedication={handleUpdateMedication}
          onDeleteMedication={handleDeleteMedication}
        />
      )}
    </div>
  );
}
