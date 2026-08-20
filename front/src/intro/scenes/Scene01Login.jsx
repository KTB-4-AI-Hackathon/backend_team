import DemoFrame from '../parts/DemoFrame';
import DemoCursor from '../parts/DemoCursor';
import Astronaut from '../../components/Astronaut';
import { LogoMark, KakaoIcon } from '../../components/Icons';

export default function Scene01Login() {
  return (
    <DemoFrame title="relationship-temperature.app">
      <div className="s1-center">
        <div className="s1-logo">
          <LogoMark size={34} />
          <b>관계온도</b>
        </div>
        <p className="s1-copy">감이 아니라 데이터로, 관계를 이해하는 시간</p>
        <button className="kakao-demo-btn" type="button">
          <KakaoIcon /> 카카오로 시작하기
        </button>
      </div>
      <div className="s1-astro">
        <Astronaut size={72} />
      </div>
      <DemoCursor variant="login" />
    </DemoFrame>
  );
}
