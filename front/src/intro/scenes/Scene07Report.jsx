import DemoAppShell from '../parts/DemoAppShell';
import DemoCursor from '../parts/DemoCursor';
import Gauge from '../../components/charts/Gauge';
import RadarChart from '../../components/charts/RadarChart';
import { SearchIcon, PlusIcon, QuoteIcon, ChatIcon } from '../../components/Icons';
import { PRQC_ORDER, PRQC_LABELS } from '../../data/constants';
import { avatarGradientFor } from '../../utils/avatar';
import '../../pages/Report.css';

const PRQC_VALUES = [78, 74, 80, 76, 70, 82];

export default function Scene07Report() {
  return (
    <DemoAppShell active="report" cursor={<DemoCursor variant="report" />}>
      <section className="report-shell">
        <aside className="people-panel">
          <div className="search-box">
            <SearchIcon />
            <input placeholder="인물 검색" readOnly tabIndex={-1} />
          </div>
          <button className="mini-person active" type="button" tabIndex={-1}>
            <div className="mini-avatar" style={{ background: avatarGradientFor('demo') }}>
              홍
            </div>
            <div>
              <div className="mini-name">홍길동</div>
              <div className="mini-score">72점 · 연인</div>
            </div>
          </button>
        </aside>
        <div className="report-main">
          <div className="report-head intro-rise" style={{ '--i': 0 }}>
            <div className="report-who">
              <div className="report-avatar" style={{ background: avatarGradientFor('demo') }}>
                홍
              </div>
              <div>
                <div className="report-name">홍길동</div>
                <span className="chip">연인</span>
              </div>
            </div>
            <button className="btn btn-ghost" type="button" tabIndex={-1}>
              <PlusIcon />
              대화 내역 추가
            </button>
          </div>
          <div className="report-grid">
            <div className="card intro-rise" style={{ '--i': 1 }}>
              <h3>종합 온도</h3>
              <div className="gauge-wrap">
                <Gauge score={72} />
                <div className="gauge-center">
                  <div className="gauge-score">72</div>
                  <div className="gauge-max">/ 100</div>
                  <div className="gauge-delta score-delta up">▲ 3</div>
                </div>
              </div>
              <div className="spark-block">
                <div className="spark-block-label">따뜻한 관계가 이어지고 있어요</div>
              </div>
            </div>
            <div className="card intro-rise" style={{ '--i': 2 }}>
              <h3>PRQC 관계 품질 6요소</h3>
              <RadarChart values={PRQC_VALUES} labels={PRQC_ORDER.map((k) => PRQC_LABELS[k])} />
            </div>
          </div>
          <div className="evidence-row">
            <div className="evidence-card intro-rise" style={{ '--i': 3 }}>
              <div className="evidence-top">
                <QuoteIcon />
                <span className="evidence-tag">관찰됨 · 애정</span>
              </div>
              <div className="evidence-text">
                7월 20일 · 26일 · 28일에도 ‘사랑해’, ‘좋아해’ 같은 애정 표현이 이어졌어요.
              </div>
            </div>
            <div className="evidence-card intro-rise" style={{ '--i': 4 }}>
              <div className="evidence-top">
                <QuoteIcon />
                <span className="evidence-tag">관찰됨 · 친밀감</span>
              </div>
              <div className="evidence-text">
                상대방이 먼저 연락한 비율이 약 70%였고, 한강 이야기를 자주 나누고 있어요.
              </div>
            </div>
          </div>
          <div className="consult-cta intro-rise" style={{ '--i': 5 }}>
            <button className="btn btn-primary intro-consult-glow" type="button" tabIndex={-1}>
              <ChatIcon />
              AI와 상담하기
            </button>
          </div>
        </div>
      </section>
    </DemoAppShell>
  );
}
