import { useEffect, useState } from 'react';
import DemoFrame from '../parts/DemoFrame';
import Astronaut from '../../components/Astronaut';

const MSGS = [
  '대화 패턴을 확인하고 있어요',
  '감정 표현을 분석하고 있어요',
  '두 사람의 관계를 분석했어요 ✓',
];

export default function Scene06Analysis() {
  const [m, setM] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setM(1), 400);
    const t2 = setTimeout(() => setM(2), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  return (
    <DemoFrame title="AI 분석">
      <div className="s6-center">
        <div className="s6-orbit">
          <i />
          <i />
          <i />
          <Astronaut size={64} />
        </div>
        <p className="s6-msg" key={m}>
          {MSGS[m]}
        </p>
        <div className="s6-bar">
          <i />
        </div>
        <button className="btn btn-primary s6-report" type="button">
          리포트 보기
        </button>
      </div>
    </DemoFrame>
  );
}
