import DemoFrame from '../parts/DemoFrame';
import TypeText from '../parts/TypeText';

export default function Scene08Chat() {
  return (
    <DemoFrame title="AI 상담">
      <div className="chat-col">
        <div className="bubble me s8-user">
          <TypeText text="요즘 권태기인 것 같아.. 대화 분석 결과는 어때?" delay={80} speed={32} />
        </div>
        <div className="bubble ai s8-think">···</div>
        <div className="bubble ai s8-answer">
          연인과의 관계가 예전 같지 않아 많이 속상하셨겠어요.
          <br />
          최근 대화에서도 <b>‘사랑해’, ‘좋아해’</b> 같은 애정 표현이 이어졌고, 상대방이 먼저 연락한
          비율도 약 <b>70%</b>로 높아요. 두 분은 <b>한강</b> 이야기를 자주 나누고 있어요.
          <span className="s8-hi">먼저 한강 데이트를 제안해보는 건 어떨까요?</span>
        </div>
      </div>
    </DemoFrame>
  );
}
