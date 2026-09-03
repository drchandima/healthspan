'use client';

import React, { useState } from 'react';
import { LabResultRecord, ExtractedOcrField, LabReportExtraction } from '@/lib/types';
import { classifyLabResult } from '@/lib/referenceRanges';
import { UploadCloud, Sparkles, AlertTriangle, CheckCircle2, FileText, X, Edit3 } from 'lucide-react';

interface OcrUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmBatch: (records: Omit<LabResultRecord, 'id'>[]) => void;
}

export default function OcrUploadModal({ isOpen, onClose, onConfirmBatch }: OcrUploadModalProps) {
  const [step, setStep] = useState<'upload' | 'scanning' | 'review'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filename, setFilename] = useState('Metabolic_Lipid_Panel_Report.pdf');
  const [extractedFields, setExtractedFields] = useState<ExtractedOcrField[]>([]);
  const [documentMeta, setDocumentMeta] = useState<Pick<LabReportExtraction, 'patient' | 'testDate' | 'laboratory'>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleStartScan = (file: File | null, fileTitle: string) => {
    setErrorMsg(null);
    setFilename(fileTitle);
    setStep('scanning');
    setScanProgress(15);

    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 25;
      });
    }, 200);

    const formData = new FormData();
    if (file) formData.append('file', file);

    fetch('/api/ocr-scan', {
      method: 'POST',
      body: formData,
    })
      .then(async res => {
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'OCR Extraction Failed');
        return data;
      })
      .then(data => {
        clearInterval(interval);
        setScanProgress(100);
        setTimeout(() => {
          const doc: LabReportExtraction | undefined = data.document;
          setExtractedFields(doc?.fields ?? data.fields ?? []);
          setDocumentMeta(
            doc ? { patient: doc.patient, testDate: doc.testDate, laboratory: doc.laboratory } : {}
          );
          setWarnings(doc?.warnings ?? []);
          setStep('review');
        }, 300);
      })
      .catch(err => {
        clearInterval(interval);
        console.error(err);
        setErrorMsg(err.message || 'OCR Extraction Failed');
        setStep('upload');
      });
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    if (file) setFilename(file.name);
  };

  const handleValueChange = (index: number, newVal: number) => {
    const updated = [...extractedFields];
    updated[index].extractedValue = newVal;
    const classification = classifyLabResult(updated[index].testName, newVal);
    updated[index].status = classification.status;
    updated[index].verified = true;
    setExtractedFields(updated);
  };

  const handleConfirmAndIngest = () => {
    const timestamp = new Date().toISOString();
    const testDate = documentMeta.testDate;
    const laboratory = documentMeta.laboratory;
    const patientName = documentMeta.patient?.patientName;

    const records: Omit<LabResultRecord, 'id'>[] = extractedFields.map(f => ({
      timestamp,
      panel: f.panel,
      testName: f.testName,
      value: f.extractedValue,
      unit: f.unit,
      referenceRange: {
        min: f.referenceMin,
        max: f.referenceMax
      },
      status: f.status,
      source: 'ocr_upload',
      ocrConfidence: f.confidence,
      reviewedByPatient: true,
      testDate,
      laboratory,
      patientName
    }));

    onConfirmBatch(records);
    onClose();
    setStep('upload');
    setSelectedFile(null);
    setExtractedFields([]);
    setDocumentMeta({});
    setWarnings([]);
  };

  const lowConfidenceCount = extractedFields.filter(f => f.isLowConfidence).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '820px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--cyan), var(--emerald))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>AI OCR Lab Report Scanner</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Automated document parsing with confidence scoring & verification gate
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* STEP 1: Upload Dropzone */}
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={e => handleFileSelect(e.target.files?.[0] ?? null)}
              />
              <div
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragActive(false);
                  handleFileSelect(e.dataTransfer.files?.[0] ?? null);
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragActive ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.15)'}`,
                  background: dragActive ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '32px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all var(--transition-normal)'
                }}
              >
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'rgba(6, 182, 212, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--cyan)',
                  marginBottom: '14px'
                }}>
                  <UploadCloud size={28} />
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  {selectedFile ? selectedFile.name : 'Drag & Drop Lab PDF or Scan Image'}
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '420px' }}>
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB — click to replace`
                    : 'Supports Quest Diagnostics, LabCorp, Hospital EHR exports (PDF, PNG, JPEG, JPG). Click to choose a file.'}
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedFile}
                onClick={() => handleStartScan(selectedFile, selectedFile?.name || 'Uploaded_Lab_Report.pdf')}
                style={{ alignSelf: 'center', opacity: selectedFile ? 1 : 0.5, cursor: selectedFile ? 'pointer' : 'not-allowed' }}
              >
                <FileText size={16} />
                <span>{selectedFile ? 'Analyze Report' : 'Select a file to begin'}</span>
              </button>

              {errorMsg && (
                <div style={{
                  background: 'var(--critical-bg, rgba(239,68,68,0.12))',
                  border: '1px solid var(--critical-border, rgba(239,68,68,0.3))',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  fontSize: '0.8rem',
                  color: 'var(--critical, #f87171)'
                }}>
                  {errorMsg}
                </div>
              )}

              {/* Sample Quick Demo Files */}
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  No file handy? Try a sample (deterministic demo data):
                </span>
                <div className="grid-3" style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleStartScan(null, 'Metabolic_Lipid_Panel_Aug2026.pdf')}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '10px', flexDirection: 'column', alignItems: 'flex-start' }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--cyan)' }}>Metabolic & Lipid Panel</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>FBS, HbA1c, Chol, LDL, HDL, Trig</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartScan(null, 'Urinalysis_Report.pdf')}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '10px', flexDirection: 'column', alignItems: 'flex-start' }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--emerald)' }}>Urinalysis Panel</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Same demo data — verify flow</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartScan(null, 'Complete_Blood_Count_CBC.pdf')}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '10px', flexDirection: 'column', alignItems: 'flex-start' }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--indigo)' }}>Hematology Panel</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Same demo data — verify flow</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Scanning Animation */}
          {step === 'scanning' && (
            <div style={{ padding: '50px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--emerald)',
                animation: 'pulseGlow 1.5s infinite'
              }}>
                <Sparkles size={30} />
              </div>

              <div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Analyzing {filename}...</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  OCR engine extracting biomarker values, units, and confidence scores
                </p>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '320px', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ width: `${scanProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--cyan), var(--emerald))', transition: 'width 0.3s ease' }} />
              </div>
              <span className="mono-num" style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{scanProgress}% Processed</span>
            </div>
          )}

          {/* STEP 3: Review & Confirm Step with Low-Confidence Flagging */}
          {step === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Report metadata */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.8rem' }}>
                <div className="badge badge-normal" style={{ fontSize: '0.72rem' }}>
                  <FileText size={12} /> {filename}
                </div>
                {documentMeta.patient?.patientName && (
                  <div className="badge badge-normal" style={{ fontSize: '0.72rem' }}>
                    Patient: {documentMeta.patient.patientName}
                  </div>
                )}
                {documentMeta.testDate && (
                  <div className="badge badge-normal" style={{ fontSize: '0.72rem' }}>
                    Test date: {documentMeta.testDate}
                  </div>
                )}
                {documentMeta.laboratory && (
                  <div className="badge badge-normal" style={{ fontSize: '0.72rem' }}>
                    {documentMeta.laboratory}
                  </div>
                )}
              </div>

              {warnings.length > 0 && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid var(--amber-border, rgba(245,158,11,0.3))',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  fontSize: '0.8rem',
                  color: 'var(--text-main)'
                }}>
                  {warnings.map((w, i) => <div key={i}>• {w}</div>)}
                </div>
              )}

              {/* Alert notice if low confidence detected */}
              {lowConfidenceCount > 0 && (
                <div style={{
                  background: 'var(--amber-bg)',
                  border: '1px solid var(--amber-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <AlertTriangle size={18} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                    <strong>{lowConfidenceCount} field(s) flagged with low OCR confidence (&lt;85%):</strong> Marked in amber below. Please review and adjust the extracted numbers before confirming.
                  </div>
                </div>
              )}

              {/* Extracted Fields Table */}
              <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '10px 12px' }}>Biomarker</th>
                      <th style={{ padding: '10px 12px' }}>Extracted Value (Editable)</th>
                      <th style={{ padding: '10px 12px' }}>Unit</th>
                      <th style={{ padding: '10px 12px' }}>Confidence Score</th>
                      <th style={{ padding: '10px 12px' }}>Status Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedFields.map((field, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          background: field.isLowConfidence ? 'rgba(245, 158, 11, 0.08)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-main)' }}>
                          {field.testName}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="number"
                              step="0.1"
                              className="form-input mono-num"
                              style={{
                                width: '100px',
                                padding: '5px 8px',
                                fontSize: '0.9rem',
                                borderColor: field.isLowConfidence ? 'var(--amber)' : 'var(--border-subtle)'
                              }}
                              value={field.extractedValue}
                              onChange={e => handleValueChange(idx, parseFloat(e.target.value) || 0)}
                            />
                            <Edit3 size={12} style={{ color: 'var(--text-dim)' }} />
                          </div>
                        </td>
                        <td className="mono-num" style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                          {field.unit}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {field.isLowConfidence ? (
                            <span className="badge badge-warning" style={{ fontSize: '0.68rem', gap: '4px' }}>
                              <AlertTriangle size={10} /> {field.confidence}% Confidence
                            </span>
                          ) : (
                            <span className="badge badge-normal" style={{ fontSize: '0.68rem', gap: '4px' }}>
                              <CheckCircle2 size={10} /> {field.confidence}% Confidence
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className={`badge ${field.status === 'normal' ? 'badge-normal' : field.status === 'borderline' ? 'badge-warning' : 'badge-critical'}`} style={{ fontSize: '0.68rem' }}>
                            {field.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 'review' ? (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep('upload')}
              >
                Re-upload / Scan Another
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmAndIngest}
              >
                <CheckCircle2 size={16} />
                <span>Confirm & Ingest {extractedFields.length} Biomarkers</span>
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
