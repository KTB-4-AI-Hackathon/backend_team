import DemoFrame from '../parts/DemoFrame';
import DemoCursor from '../parts/DemoCursor';

export default function Scene04Upload() {
  return (
    <DemoFrame title="카카오톡 대화 업로드">
      <div className="s4-wrap">
        <div className="s4-kakao">
          <div className="s4-kakao-head">홍길동 ♥</div>
          <div className="s4-menu">
            <span>사진 보내기</span>
            <span className="s4-menu-hot">대화 내보내기</span>
            <span>설정</span>
          </div>
        </div>
        <div className="s4-file">📄 홍길동_대화.txt</div>
        <div className="s4-drop">
          <span className="s4-drop-idle">여기로 파일을 끌어다 놓으세요</span>
          <span className="s4-drop-done">홍길동_대화.txt ✓</span>
        </div>
      </div>
      <DemoCursor variant="upload" />
    </DemoFrame>
  );
}
