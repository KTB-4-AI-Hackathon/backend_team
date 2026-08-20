import { useEffect, useState } from 'react';
import DemoAppShell from '../parts/DemoAppShell';
import DashboardDemo from '../parts/DashboardDemo';
import DemoModal from '../parts/DemoModal';
import DemoCursor from '../parts/DemoCursor';

export default function Scene05Checkin() {
  const [q1, setQ1] = useState(4);
  const [q2, setQ2] = useState(5);
  useEffect(() => {
    const timers = [
      setTimeout(() => setQ1(3), 350),
      setTimeout(() => setQ1(2), 550),
      setTimeout(() => setQ2(4), 800),
      setTimeout(() => setQ2(3), 1000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <DemoAppShell
      active="dashboard"
      cursor={
        <>
          <DemoModal step={3} nextLabel="분석 시작하기">
            <div>
              <div className="modal-title">짧은 체크인이에요</div>
              <div className="modal-sub">지금 느끼는 그대로 답해주세요, 정답은 없어요</div>
              <div className="checkin-q">
                <p>요즘 이 사람과의 관계, 어떻게 느껴지세요?</p>
                <div className="slider-row">
                  <input type="range" min="1" max="7" value={q1} readOnly tabIndex={-1} />
                  <span className="slider-val">{q1}</span>
                </div>
                <div className="slider-ends">
                  <span>힘들다</span>
                  <span>편안하다</span>
                </div>
              </div>
              <div className="checkin-q">
                <p>최근 이 사람과 대화할 때 얼마나 편안함을 느끼시나요?</p>
                <div className="slider-row">
                  <input type="range" min="1" max="7" value={q2} readOnly tabIndex={-1} />
                  <span className="slider-val">{q2}</span>
                </div>
                <div className="slider-ends">
                  <span>전혀 편안하지 않아요</span>
                  <span>매우 편안해요</span>
                </div>
              </div>
              <p className="checkin-note">이 질문은 앞으로 매주 다시 물어볼 거예요</p>
            </div>
          </DemoModal>
          <DemoCursor variant="checkin" />
        </>
      }
    >
      <DashboardDemo />
    </DemoAppShell>
  );
}
