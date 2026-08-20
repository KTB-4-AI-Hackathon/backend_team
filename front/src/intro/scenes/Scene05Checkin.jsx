import DemoFrame from '../parts/DemoFrame';
import DemoCursor from '../parts/DemoCursor';

const ROWS = [
  { q: '최근 상대와 대화가 즐거웠나요?', pick: 2, cls: 's5-r1' },
  { q: '최근 관계에 만족하고 있나요?', pick: 3, cls: 's5-r2' },
];

export default function Scene05Checkin() {
  return (
    <DemoFrame title="관계 체크인">
      {ROWS.map(({ q, pick, cls }) => (
        <div key={q} className={`s5-row ${cls}`}>
          <p>{q}</p>
          <div className="s5-scores">
            {[1, 2, 3, 4, 5].map((n) => (
              <i key={n} className={n === pick ? 'hit' : ''}>
                {n}
              </i>
            ))}
          </div>
        </div>
      ))}
      <button className="btn btn-primary s5-go" type="button">
        분석 시작
      </button>
      <DemoCursor variant="checkin" />
    </DemoFrame>
  );
}
