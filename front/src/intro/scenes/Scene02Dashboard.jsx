import DemoFrame from '../parts/DemoFrame';
import DemoCursor from '../parts/DemoCursor';

export default function Scene02Dashboard() {
  return (
    <DemoFrame title="관계온도 — 대시보드">
      <div className="s2-dim">
        <h2 className="mini-title">나의 우주</h2>
        <p className="mini-sub">아직 등록된 인물이 없어요. 첫 인물을 등록해볼까요?</p>
      </div>
      <button className="s2-add btn btn-primary" type="button">
        + 새 인물 등록
      </button>
      <DemoCursor variant="dashboard" />
    </DemoFrame>
  );
}
