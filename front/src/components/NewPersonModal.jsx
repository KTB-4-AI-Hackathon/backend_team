import { useEffect, useRef, useState } from 'react';
import { createRelationship } from '../api/relationships';
import { uploadConversationFile, getConversationFile } from '../api/conversationFiles';
import { submitCheckIn } from '../api/checkins';
import { startAnalysis, pollAnalysisJob } from '../api/analyses';
import { RELATIONSHIP_TYPES, ANALYSIS_STAGE_LABELS } from '../data/constants';
import { CloseIcon, UploadIcon, CheckIcon } from './Icons';
import Astronaut from './Astronaut';
import './NewPersonModal.css';

const CIRCUMFERENCE = 2 * Math.PI * 27;

export default function NewPersonModal({ open, onClose, mode = 'create', relationship = null, onSuccess }) {
  const isAddData = mode === 'add-data';
  const [step, setStep] = useState(isAddData ? 2 : 1);
  const [phase, setPhase] = useState('form'); // form | loading | success | error
  const [name, setName] = useState('');
  const [relType, setRelType] = useState('ROMANTIC_PARTNER');
  const [relationshipId, setRelationshipId] = useState(isAddData ? relationship?.id ?? null : null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [fileState, setFileState] = useState(null); // { name, sizeBytes, status: 'uploading'|'valid'|'invalid' }
  const [conversationFileId, setConversationFileId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const [q1, setQ1] = useState(4);
  const [q2, setQ2] = useState(5);

  const [job, setJob] = useState(null);
  const [failure, setFailure] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setStep(isAddData ? 2 : 1);
    setPhase('form');
    setName('');
    setRelType('ROMANTIC_PARTNER');
    setRelationshipId(isAddData ? relationship?.id ?? null : null);
    setFormError(null);
    setFileState(null);
    setConversationFileId(null);
    setQ1(4);
    setQ2(5);
    setJob(null);
    setFailure(null);
  }, [open, isAddData, relationship]);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!open) return null;

  async function handleFile(file) {
    if (!file) return;
    setFileState({ name: file.name, sizeBytes: file.size, status: 'uploading' });
    try {
      const uploaded = await uploadConversationFile(relationshipId, file);
      setConversationFileId(uploaded.id);
      if (uploaded.validationStatus === 'VALIDATING') {
        await waitForValidation(uploaded.id);
      } else {
        setFileState({ name: uploaded.originalFileName, sizeBytes: uploaded.sizeBytes, status: uploaded.validationStatus === 'VALID' ? 'valid' : 'invalid' });
      }
    } catch (err) {
      setFileState({ name: file.name, sizeBytes: file.size, status: 'invalid', message: err.message });
    }
  }

  async function waitForValidation(fileId) {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1200));
      const f = await getConversationFile(fileId);
      if (f.validationStatus !== 'VALIDATING') {
        setFileState({ name: f.originalFileName, sizeBytes: f.sizeBytes, status: f.validationStatus === 'VALID' ? 'valid' : 'invalid' });
        return;
      }
    }
  }

  async function handleStep1Next() {
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('이름을 입력해 주세요');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await createRelationship({ name: trimmed, relationshipType: relType });
      setRelationshipId(created.id);
      setStep(2);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinalStart() {
    setSubmitting(true);
    setFormError(null);
    try {
      const checkIn = await submitCheckIn(relationshipId, { feeling: q1, comfort: q2 });
      await runAnalysis(checkIn.id);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function runAnalysis(checkInId) {
    setPhase('loading');
    setFailure(null);
    try {
      const startedJob = await startAnalysis(relationshipId, { conversationFileId, checkInId });
      setJob(startedJob);
      const controller = new AbortController();
      abortRef.current = controller;
      const finalJob = await pollAnalysisJob(startedJob.id, { onUpdate: setJob, signal: controller.signal });
      setJob(finalJob);
      if (finalJob.status === 'SUCCEEDED') {
        setPhase('success');
      } else {
        setFailure(finalJob.failure || { message: '분석을 완료하지 못했어요.', retryable: true });
        setPhase('error');
      }
    } catch (err) {
      setFailure({ message: err.message, retryable: true });
      setPhase('error');
    }
  }

  function handleGoToReport() {
    onSuccess?.({ id: relationshipId });
    onClose();
  }

  const displayName = isAddData ? relationship?.name : name;
  const progress = job?.progress ?? 0;
  const progressOffset = CIRCUMFERENCE * (1 - progress / 100);
  const stageLabel = job?.stage ? ANALYSIS_STAGE_LABELS[job.stage] : '대화를 살펴보는 중이에요';

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <button className="modal-close" aria-label="닫기" onClick={onClose}>
          <CloseIcon />
        </button>

        {phase === 'form' && (
          <>
            {!isAddData && (
              <div className="stepper">
                <StepDot n={1} step={step} />
                <div className={`step-line ${step > 1 ? 'done' : ''}`} />
                <StepDot n={2} step={step} />
                <div className={`step-line ${step > 2 ? 'done' : ''}`} />
                <StepDot n={3} step={step} />
              </div>
            )}

            {step === 1 && (
              <div>
                <div className="modal-title">어떤 관계인가요?</div>
                <div className="modal-sub">등록할 인물의 정보를 알려주세요</div>
                <label className="field-label" htmlFor="personName">이름</label>
                <input
                  id="personName"
                  className="text-input"
                  placeholder="예) 박준혁"
                  style={{ marginBottom: 8 }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {formError && <p className="checkin-note" style={{ color: 'var(--accent-coral)', marginBottom: 10 }}>{formError}</p>}
                <label className="field-label" style={{ marginTop: 10 }}>관계 유형</label>
                <div className="chip-row">
                  {RELATIONSHIP_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className={`chip-btn ${relType === t.value ? 'selected' : ''}`}
                      onClick={() => setRelType(t.value)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="modal-title">대화 데이터를 올려주세요</div>
                <div className="modal-sub">카카오톡 대화 내보내기(.txt) 파일이면 충분해요</div>
                <div
                  className={`dropzone ${dragActive ? 'drag' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
                  }}
                >
                  <UploadIcon />
                  <div className="dropzone-text">파일을 여기로 끌어다 놓거나 클릭하여 업로드</div>
                  <div className="dropzone-sub">.txt 파일 · 최대 50MB</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  hidden
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <ExportHelpLink />

                {fileState?.status === 'uploading' && (
                  <p className="checkin-note" style={{ marginTop: 10 }}>파일을 확인하는 중이에요...</p>
                )}
                {fileState?.status === 'valid' && (
                  <div className="file-done">
                    <CheckIcon />
                    <div>
                      <div className="file-done-name">{fileState.name}</div>
                      <div className="file-done-size">{(fileState.sizeBytes / 1024).toFixed(0)}KB</div>
                    </div>
                  </div>
                )}
                {fileState?.status === 'invalid' && (
                  <p className="checkin-note" style={{ marginTop: 10, color: 'var(--accent-coral)' }}>
                    {fileState.message || '카카오톡 대화 내보내기 파일을 확인할 수 없어요. 다른 파일로 다시 시도해 주세요.'}
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="modal-title">짧은 체크인이에요</div>
                <div className="modal-sub">지금 느끼는 그대로 답해주세요, 정답은 없어요</div>

                <div className="checkin-q">
                  <p>요즘 이 사람과의 관계, 어떻게 느껴지세요?</p>
                  <div className="slider-row">
                    <input type="range" min="1" max="7" value={q1} onChange={(e) => setQ1(+e.target.value)} />
                    <span className="slider-val">{q1}</span>
                  </div>
                  <div className="slider-ends"><span>힘들다</span><span>편안하다</span></div>
                </div>

                <div className="checkin-q">
                  <p>최근 이 사람과 대화할 때 얼마나 편안함을 느끼시나요?</p>
                  <div className="slider-row">
                    <input type="range" min="1" max="7" value={q2} onChange={(e) => setQ2(+e.target.value)} />
                    <span className="slider-val">{q2}</span>
                  </div>
                  <div className="slider-ends"><span>전혀 편안하지 않아요</span><span>매우 편안해요</span></div>
                </div>

                {formError && <p className="checkin-note" style={{ color: 'var(--accent-coral)' }}>{formError}</p>}
                <p className="checkin-note">이 질문은 앞으로 매주 짧게 다시 물어볼 거예요</p>
              </div>
            )}

            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                style={{ visibility: step > (isAddData ? 2 : 1) ? 'visible' : 'hidden' }}
                onClick={() => setStep((s) => Math.max(isAddData ? 2 : 1, s - 1))}
                disabled={submitting}
              >
                이전
              </button>
              <button
                className="btn btn-primary"
                disabled={
                  submitting ||
                  (step === 2 && fileState?.status !== 'valid') ||
                  (step === 1 && !name.trim())
                }
                onClick={() => {
                  if (step === 1) return handleStep1Next();
                  if (step === 2) return setStep(3);
                  return handleFinalStart();
                }}
              >
                {submitting ? '처리 중...' : step === 3 ? '분석 시작하기' : '다음'}
              </button>
            </div>
          </>
        )}

        {phase === 'loading' && (
          <div className="loading-state">
            <div className="loading-astro">
              <Astronaut size={76} />
            </div>
            <div className="loading-title">대화를 분석하고 있어요</div>
            <div className="loading-sub">{stageLabel}</div>
            <svg className="progress-ring" viewBox="0 0 64 64">
              <circle className="progress-track" cx="32" cy="32" r="27" />
              <circle
                className="progress-bar"
                cx="32"
                cy="32"
                r="27"
                strokeDasharray={CIRCUMFERENCE.toFixed(1)}
                strokeDashoffset={progressOffset.toFixed(1)}
              />
            </svg>
          </div>
        )}

        {phase === 'success' && (
          <div className="success-state">
            <div className="success-badge">
              <CheckIcon strokeWidth="2.4" />
            </div>
            <div className="loading-title">분석이 끝났어요</div>
            <div className="loading-sub">{displayName || '등록하신 분'}과의 관계 온도가 반영됐어요</div>
            <button className="btn btn-primary" onClick={handleGoToReport}>
              리포트 보기
            </button>
          </div>
        )}

        {phase === 'error' && (
          <div className="success-state">
            <div className="success-badge" style={{ background: 'var(--accent-amber-soft)', borderColor: 'var(--accent-amber-border)' }}>
              <CloseIcon style={{ color: 'var(--accent-amber)' }} />
            </div>
            <div className="loading-title">분석을 끝내지 못했어요</div>
            <div className="loading-sub">{failure?.message || '일시적인 오류가 있었어요. 잠시 후 다시 시도해 주세요.'}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={onClose}>닫기</button>
              {failure?.retryable !== false && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setStep(3);
                    setPhase('form');
                  }}
                >
                  다시 시도
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepDot({ n, step }) {
  const done = n < step;
  const active = n === step;
  return (
    <div className={`step-dot ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
      {done ? <CheckIcon strokeWidth="3" style={{ width: 13, height: 13 }} /> : n}
    </div>
  );
}

function ExportHelpLink() {
  const [show, setShow] = useState(false);
  return (
    <>
      <button className="link-quiet" style={{ marginTop: 10 }} onClick={() => setShow((v) => !v)} type="button">
        카카오톡 대화 내보내기 방법 보기
      </button>
      {show && (
        <p className="checkin-note" style={{ marginTop: 8 }}>
          카카오톡 채팅방 &gt; 메뉴 &gt; 대화 내보내기를 선택하면 .txt 파일로 저장할 수 있어요.
        </p>
      )}
    </>
  );
}

export function useNewPersonModal() {
  const [open, setOpen] = useState(false);
  return { open, openModal: () => setOpen(true), closeModal: () => setOpen(false) };
}
