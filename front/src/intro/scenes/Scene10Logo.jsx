import Astronaut from '../../components/Astronaut';
import Moon from '../../components/Moon';
import { LogoMark } from '../../components/Icons';
import { Rocket, Planet } from '../parts/SpaceProps';

const SLOTS = [
  { ch: '관', Obj: () => <Rocket size={54} /> },
  { ch: '계', Obj: () => <Astronaut size={54} /> },
  { ch: '온', Obj: () => <Planet size={54} /> },
  { ch: '도', Obj: () => <Moon scale={0.5} /> },
];

export default function Scene10Logo() {
  return (
    <div className="s10-wrap">
      <div className="s10-row">
        <span className="s10-mark">
          <LogoMark size={40} />
        </span>
        {SLOTS.map(({ ch, Obj }, i) => (
          <span key={ch} className="s10-slot" style={{ '--i': i }}>
            <span className="s10-obj">
              <Obj />
            </span>
            <span className="s10-char">{ch}</span>
          </span>
        ))}
      </div>
      <p className="s10-tag">당신의 대화 속에 관계를 이해할 힌트가 있어요.</p>
    </div>
  );
}
