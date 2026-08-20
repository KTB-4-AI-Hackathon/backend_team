import DemoFrame from '../parts/DemoFrame';
import DemoCursor from '../parts/DemoCursor';
import TypeText from '../parts/TypeText';

export default function Scene03Form() {
  return (
    <DemoFrame title="새 인물 등록">
      <div className="s3-field">
        <label>이름</label>
        <div className="s3-input">
          <TypeText text="홍길동" delay={100} speed={90} />
        </div>
      </div>
      <div className="s3-field">
        <label>관계</label>
        <div className="s3-rels">
          <span>친구</span>
          <span>가족</span>
          <span className="picked">연인</span>
          <span>기타</span>
        </div>
      </div>
      <button className="btn btn-primary s3-next" type="button">
        다음
      </button>
      <DemoCursor variant="form" />
    </DemoFrame>
  );
}
