import DemoFrame from '../parts/DemoFrame';
import DemoCursor from '../parts/DemoCursor';

const METRICS = [
  ['관계 온도', '72°'],
  ['먼저 연락한 비율', '7 : 3'],
  ['애정 표현', '최근에도 지속'],
  ['자주 등장한 장소', '한강'],
];

export default function Scene07Report() {
  return (
    <DemoFrame title="홍길동 — 관계 리포트">
      <div className="s7-grid">
        {METRICS.map(([k, v], i) => (
          <div key={k} className="s7-row" style={{ '--i': i }}>
            <span>{k}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>
      <button className="btn btn-primary s7-cta" type="button">
        AI와 상담하기
      </button>
      <DemoCursor variant="report" />
    </DemoFrame>
  );
}
