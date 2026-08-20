import DemoFrame from '../parts/DemoFrame';
import TypeText from '../parts/TypeText';

export default function Scene09Kakao() {
  return (
    <DemoFrame title="카카오톡 — 홍길동 ♥">
      <div className="chat-col">
        <div className="bubble me kk s9-user">
          <TypeText
            text="나 최근에.. 우리 관계가 조금 권태기인 것 같아. 같이 한강 가서 이야기해볼까?"
            delay={100}
            speed={30}
          />
        </div>
        <div className="bubble other s9-think">···</div>
        <div className="bubble other s9-reply">
          그랬구나.. 몰라줘서 미안해.
          <br />
          한강 가서 같이 맛있는 것도 먹고 이야기해보자 :)
        </div>
      </div>
    </DemoFrame>
  );
}
