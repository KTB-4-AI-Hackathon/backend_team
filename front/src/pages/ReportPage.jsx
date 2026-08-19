import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listRelationships, getRelationship } from '../api/relationships';
import { fetchReport } from '../api/reports';
import { createConsultation } from '../api/consultations';
import { avatarGradientFor, initialsOf } from '../utils/avatar';
import { PRQC_ORDER, PRQC_LABELS, RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_STATUS_LABELS } from '../data/constants';
import Gauge from '../components/charts/Gauge';
import RadarChart from '../components/charts/RadarChart';
import TrendLineChart from '../components/charts/TrendLineChart';
import Astronaut from '../components/Astronaut';
import NewPersonModal, { useNewPersonModal } from '../components/NewPersonModal';
import { SearchIcon, PlusIcon, QuoteIcon, ChatIcon } from '../components/Icons';
import './Report.css';

export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { open, openModal, closeModal } = useNewPersonModal();

  const [query, setQuery] = useState('');
  const [people, setPeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(true);

  const loadPeople = useCallback(async (search) => {
    setPeopleLoading(true);
    try {
      const list = await listRelationships({ search: search || undefined });
      setPeople(list);
    } finally {
      setPeopleLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadPeople(query), 250);
    return () => clearTimeout(t);
  }, [query, loadPeople]);

  const selected = useMemo(() => people.find((p) => p.id === id) ?? null, [people, id]);

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [fallbackRelationship, setFallbackRelationship] = useState(null);
  const [consultLoading, setConsultLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setReport(null);
    setReportError(null);
    setFallbackRelationship(null);
    setReportLoading(true);
    fetchReport(id)
      .then(setReport)
      .catch(async (err) => {
        setReportError(err);
        // Report doesn't exist yet (relationship still DRAFT/ANALYZING/FAILED).
        // Fetch the bare relationship so we can still show its name/status.
        try {
          setFallbackRelationship(await getRelationship(id));
        } catch {
          /* relationship itself is gone or not owned — reportError covers it */
        }
      })
      .finally(() => setReportLoading(false));
  }, [id]);

  async function handleStartConsultation() {
    if (!id) return;
    setConsultLoading(true);
    try {
      const consultation = await createConsultation(id);
      navigate(`/chat/${consultation.id}`);
    } catch (err) {
      window.alert(err.message || '상담을 시작하지 못했어요.');
    } finally {
      setConsultLoading(false);
    }
  }

  return (
    <section className="report-shell">
      <aside className="people-panel">
        <div className="search-box">
          <SearchIcon />
          <input placeholder="인물 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {!peopleLoading && people.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 4px' }}>등록된 인물이 없어요</p>
        )}
        {people.map((p) => (
          <button
            key={p.id}
            className={`mini-person ${p.id === id ? 'active' : ''}`}
            onClick={() => navigate(`/report/${p.id}`)}
          >
            <div className="mini-avatar" style={{ background: avatarGradientFor(p.id) }}>
              {p.initial || initialsOf(p.name)}
            </div>
            <div>
              <div className="mini-name">{p.name}</div>
              <div className="mini-score">
                {p.status === 'ACTIVE' ? `${p.score}점 · ` : ''}
                {RELATIONSHIP_TYPE_LABELS[p.relationshipType]}
                {p.status !== 'ACTIVE' && ` · ${RELATIONSHIP_STATUS_LABELS[p.status] ?? p.status}`}
              </div>
            </div>
          </button>
        ))}
      </aside>

      <div className="report-main">
        {!id && <SelectPrompt />}

        {id && reportLoading && <CenteredNote text="리포트를 불러오는 중이에요" />}

        {id && !reportLoading && reportError && (
          <NoReportState
            relationship={selected || fallbackRelationship}
            onAddData={openModal}
          />
        )}

        {id && !reportLoading && !reportError && report && (
          <ReportBody
            report={report}
            onAddData={openModal}
            onConsult={handleStartConsultation}
            consultLoading={consultLoading}
          />
        )}
      </div>

      <NewPersonModal
        open={open}
        onClose={closeModal}
        mode="add-data"
        relationship={selected || fallbackRelationship || { id, name: '' }}
        onSuccess={() => {
          loadPeople(query);
          fetchReport(id).then(setReport).then(() => setReportError(null));
        }}
      />
    </section>
  );
}

function ReportBody({ report, onAddData, onConsult, consultLoading }) {
  const up = (report.overall.change ?? 0) >= 0;
  const prqcValues = PRQC_ORDER.map((k) => report.prqc[k]);
  const hasTrend = report.trend.length >= 2;

  return (
    <>
      <div className="report-head">
        <div className="report-who">
          <div className="report-avatar" style={{ background: avatarGradientFor(report.relationship.id) }}>
            {report.relationship.initial || initialsOf(report.relationship.name)}
          </div>
          <div>
            <div className="report-name">{report.relationship.name}</div>
            <span className="chip">{RELATIONSHIP_TYPE_LABELS[report.relationship.relationshipType]}</span>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={onAddData}>
          <PlusIcon />
          대화 내역 추가
        </button>
      </div>

      <div className="report-grid">
        <div className="card">
          <h3>종합 온도</h3>
          <div className="gauge-wrap">
            <Gauge score={report.overall.score} />
            <div className="gauge-center">
              <div className="gauge-score">{report.overall.score}</div>
              <div className="gauge-max">/ 100</div>
              {report.overall.change != null && (
                <div className={`gauge-delta score-delta ${up ? 'up' : 'down'}`}>
                  {up ? '▲' : '▼'} {Math.abs(report.overall.change)}
                </div>
              )}
            </div>
          </div>
          <div className="spark-block">
            <div className="spark-block-label">{report.overall.statusLabel}</div>
          </div>
        </div>

        <div className="card">
          <h3>PRQC 관계 품질 6요소</h3>
          <RadarChart values={prqcValues} labels={PRQC_ORDER.map((k) => PRQC_LABELS[k])} />
          <div className="radar-legend">
            <div className="radar-legend-item">
              <span className="radar-legend-swatch" style={{ background: 'var(--accent-pink)' }} />
              현재 점수 (100점 만점)
            </div>
            <div className="radar-legend-item">
              <span className="radar-legend-swatch" style={{ background: 'var(--accent-amber)', borderRadius: 0 }} />
              위험 기준선 (60점)
            </div>
          </div>
        </div>
      </div>

      <div className="evidence-row">
        {report.evidences.length > 0 ? (
          report.evidences.slice(0, 2).map((ev) => (
            <div className="evidence-card" key={ev.id}>
              <div className="evidence-top">
                <QuoteIcon />
                <span className="evidence-tag">관찰됨 · {PRQC_LABELS[ev.component] ?? ev.component}</span>
              </div>
              <div className="evidence-text">{ev.summary}</div>
            </div>
          ))
        ) : (
          <div className="evidence-card positive">
            <div className="evidence-top">
              <QuoteIcon />
              <span className="evidence-tag">관찰됨</span>
            </div>
            <div className="evidence-text">뚜렷한 위험 신호는 관찰되지 않았어요. 지금처럼 편안한 대화가 이어지고 있어요.</div>
          </div>
        )}
      </div>

      <div className="card trend-card">
        <h3>시간에 따른 변화</h3>
        <div className="trend-chart-wrap">
          {hasTrend ? (
            <TrendLineChart data={report.trend.map((t) => t.score)} labels={report.trend.map((t) => t.label)} />
          ) : (
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              다음 분석부터 추이 그래프를 볼 수 있어요.
            </p>
          )}
        </div>
      </div>

      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
        {report.disclaimer}
      </p>

      <div className="consult-cta">
        <button className="btn btn-primary" onClick={onConsult} disabled={consultLoading}>
          <ChatIcon />
          {consultLoading ? '연결하는 중...' : 'AI와 상담하기'}
        </button>
      </div>
    </>
  );
}

function NoReportState({ relationship, onAddData }) {
  return (
    <div className="empty-universe" style={{ padding: '80px 20px' }}>
      <div style={{ margin: '0 auto 18px' }}>
        <Astronaut size={80} />
      </div>
      <h2 className="empty-title">
        {relationship?.name ? `${relationship.name}님의 리포트가 아직 없어요` : '리포트가 아직 없어요'}
      </h2>
      <p className="empty-sub">
        대화 데이터를 올리고 짧은 체크인을 마치면
        <br />PRQC 기반 관계 온도를 확인할 수 있어요.
      </p>
      <button className="btn btn-primary empty-cta" onClick={onAddData}>
        <PlusIcon />
        대화 데이터 올리기
      </button>
    </div>
  );
}

function SelectPrompt() {
  return (
    <div className="empty-universe" style={{ padding: '100px 20px' }}>
      <div style={{ margin: '0 auto 18px' }}>
        <Astronaut size={80} />
      </div>
      <h2 className="empty-title">왼쪽에서 인물을 선택해 주세요</h2>
      <p className="empty-sub">등록된 인물을 고르면 관계 온도 리포트를 볼 수 있어요.</p>
    </div>
  );
}

function CenteredNote({ text }) {
  return (
    <div className="empty-universe" style={{ padding: '100px 20px' }}>
      <p className="empty-sub">{text}</p>
    </div>
  );
}
