import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Starfield from '../components/Starfield';
import { LogoMark } from '../components/Icons';
import StageStack from './parts/StageStack';
import Scene01Login from './scenes/Scene01Login';
import Scene02Dashboard from './scenes/Scene02Dashboard';
import Scene03Form from './scenes/Scene03Form';
import Scene04Upload from './scenes/Scene04Upload';
import Scene05Checkin from './scenes/Scene05Checkin';
import Scene06Analysis from './scenes/Scene06Analysis';
import Scene07Report from './scenes/Scene07Report';
import Scene08Chat from './scenes/Scene08Chat';
import Scene09Kakao from './scenes/Scene09Kakao';
import Scene10Logo from './scenes/Scene10Logo';
import './intro.css';

// 새로고침(페이지 로드)마다 다시 재생: 저장소 대신 메모리 플래그를 쓴다.
// 같은 로드 안에서의 SPA 이동으로 /login에 돌아올 때만 중복 재생을 막는다.
let playedThisLoad = false;
export function hasIntroPlayed() {
  return playedThisLoad;
}

const SCENES = [
  { id: 'login', dur: 1600, stage: null, Comp: Scene01Login },
  { id: 'dashboard', dur: 1600, stage: null, Comp: Scene02Dashboard },
  { id: 'form', dur: 2500, stage: '인물 등록', Comp: Scene03Form },
  { id: 'upload', dur: 2500, stage: '대화 업로드', Comp: Scene04Upload },
  { id: 'checkin', dur: 2500, stage: '체크인', Comp: Scene05Checkin },
  { id: 'analysis', dur: 2800, stage: 'AI 분석', Comp: Scene06Analysis },
  { id: 'report', dur: 2700, stage: '리포트', Comp: Scene07Report },
  { id: 'chat', dur: 4600, stage: 'AI 상담', Comp: Scene08Chat },
  { id: 'kakao', dur: 4900, stage: '실제 대화', Comp: Scene09Kakao },
  { id: 'logo', dur: 4300, stage: null, Comp: Scene10Logo },
];

// 개발용: /intro?scene=<id> 로 특정 장면을 고정해 미세 조정할 수 있다.
const HOLD_ID = new URLSearchParams(window.location.search).get('scene');

export default function IntroPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [idx, setIdx] = useState(() => {
    const i = SCENES.findIndex((s) => s.id === HOLD_ID);
    return i >= 0 ? i : 0;
  });
  const isStatic = useMemo(
    () =>
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
      // innerWidth 0은 아직 측정 불가 상태(프리렌더 등)이므로 모바일로 취급하지 않는다.
      (window.innerWidth > 0 && window.innerWidth < 768),
    []
  );

  const finish = useCallback(() => {
    playedThisLoad = true;
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (isLoggedIn) navigate('/dashboard', { replace: true });
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && finish();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  useEffect(() => {
    if (HOLD_ID) return;
    if (isStatic) {
      const t = setTimeout(finish, 1600);
      return () => clearTimeout(t);
    }
    if (idx >= SCENES.length) {
      finish();
      return;
    }
    const t = setTimeout(() => setIdx((i) => i + 1), SCENES[idx].dur);
    return () => clearTimeout(t);
  }, [idx, isStatic, finish]);

  if (isStatic)
    return (
      <div className="intro-root">
        <Starfield />
        <div className="intro-static-center">
          <LogoMark size={46} />
          <div className="intro-static-name">관계온도</div>
          <p className="intro-static-tag">당신의 대화 속에 관계를 이해할 힌트가 있어요.</p>
        </div>
      </div>
    );

  if (idx >= SCENES.length) return null;
  const scene = SCENES[idx];
  const SceneComp = scene.Comp;
  const stages = SCENES.slice(0, idx)
    .map((s) => s.stage)
    .filter(Boolean);
  return (
    <div className="intro-root">
      <Starfield />
      {scene.id !== 'logo' && <StageStack stages={stages} />}
      <div className={scene.id === 'logo' ? 'intro-fullbleed' : 'intro-stage'}>
        <div className="intro-scene-swap" key={scene.id}>
          <SceneComp />
        </div>
      </div>
      {scene.id === 'logo' && <div className="s10-fade" />}
    </div>
  );
}
