import { useState } from 'react';
import { PersonIcon, UploadIcon, CheckIcon, SparkleIcon, ChatIcon, ChevronDownIcon } from '../components/Icons';
import GuideDemoPlayer from '../guide/GuideDemoPlayer';
import { FAMILY_GUIDE_SCENES, FAMILY_GUIDE_POSTER } from '../guide/familyScenario';
import { PARTNER_GUIDE_SCENES, PARTNER_GUIDE_POSTER } from '../guide/partnerScenario';
import exportStep1 from '../assets/guide/kakao-export-step1.png';
import exportStep2 from '../assets/guide/kakao-export-step2.png';
import exportStep3 from '../assets/guide/kakao-export-step3.png';
import exportStep4 from '../assets/guide/kakao-export-step4.png';
import exportStep5 from '../assets/guide/kakao-export-step5.png';
import './Guide.css';

// 카카오톡 PC버전에서 대화를 내보내는 5단계 (예시 화면은 가상의 데이터로 재현했어요)
const EXPORT_STEPS = [
  { img: exportStep1, caption: '① 채팅 목록에서 내보낼 채팅방을 선택해요' },
  { img: exportStep2, caption: '② 채팅방 오른쪽 위 메뉴(☰)를 눌러요' },
  { img: exportStep3, caption: "③ '채팅방 설정'을 선택해요" },
  { img: exportStep4, caption: "④ '대화 내용 관리'에서 '텍스트 파일로 저장'을 눌러요" },
  { img: exportStep5, caption: '⑤ 저장한 .txt 파일을 업로드에 사용하면 끝!' },
];

const STEPS = [
  {
    icon: PersonIcon,
    title: '1. 인물 등록',
    desc: '관계가 궁금한 사람을 등록해요. 가족, 연인, 친구 누구든 좋아요.',
  },
  {
    icon: UploadIcon,
    title: '2. 대화 내역 업로드',
    desc: '카카오톡 대화 내보내기 파일을 올리면 AI가 대화 속 패턴을 읽어요.',
    expandable: true,
  },
  {
    icon: CheckIcon,
    title: '3. 데일리 체크인',
    desc: '오늘의 감정과 사건을 짧게 기록하면 분석이 더 정확해져요.',
  },
  {
    icon: SparkleIcon,
    title: '4. 리포트 확인',
    desc: '관계 온도와 PRQC 6요소 점수를 근거와 함께 확인할 수 있어요.',
  },
  {
    icon: ChatIcon,
    title: '5. AI 상담',
    desc: '리포트를 바탕으로 AI 챗봇과 관계 고민을 상담해요.',
  },
];

// scenes가 있으면 실시간 렌더링 데모가 재생되고, 없으면 준비 중 상태로 표시돼요.
const EXAMPLE_VIDEOS = [
  {
    id: 'family',
    tag: '가족',
    title: '30~50대 · 자녀와의 관계가 고민될 때',
    desc: '사춘기 자녀와의 냉랭한 대화를 분석하고, 다시 가까워지는 과정을 담은 예시예요.',
    scenes: FAMILY_GUIDE_SCENES,
    poster: FAMILY_GUIDE_POSTER,
  },
  {
    id: 'partner',
    tag: '배우자',
    title: '배우자와의 관계가 고민될 때',
    desc: '바쁜 시간대마다 날카로워지는 대화 패턴을 발견하고, 관계 온도를 회복해가는 과정을 담은 예시예요.',
    scenes: PARTNER_GUIDE_SCENES,
    poster: PARTNER_GUIDE_POSTER,
  },
];

export default function GuidePage() {
  const [exportOpen, setExportOpen] = useState(false);
  return (
    <section className="guide-shell">
      <div className="guide-head">
        <h2 className="guide-title">사용 가이드</h2>
        <p className="guide-sub">WouldU를 처음 사용하시나요? 이렇게 시작해보세요.</p>
      </div>

      <h3 className="guide-section-title">이용 순서</h3>
      <div className="guide-steps">
        {STEPS.map((step) => (
          <div className="card guide-step" key={step.title}>
            <div className="guide-step-row">
              <div className="guide-step-icon">
                <step.icon />
              </div>
              <div className="guide-step-texts">
                <div className="guide-step-title">{step.title}</div>
                <div className="guide-step-desc">{step.desc}</div>
              </div>
              {step.expandable && (
                <button
                  type="button"
                  className={`guide-step-toggle${exportOpen ? ' open' : ''}`}
                  onClick={() => setExportOpen((v) => !v)}
                  aria-expanded={exportOpen}
                >
                  내보내는 방법
                  <ChevronDownIcon />
                </button>
              )}
            </div>
            {step.expandable && exportOpen && (
              <div className="guide-export-steps">
                {EXPORT_STEPS.map((es) => (
                  <figure className="guide-export-step" key={es.caption}>
                    <img src={es.img} alt={es.caption} />
                    <figcaption>{es.caption}</figcaption>
                  </figure>
                ))}
                <p className="guide-export-note">
                  예시 화면은 개인정보 보호를 위해 가상의 대화로 재현한 이미지예요.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <h3 className="guide-section-title">상황별 활용 예시</h3>
      <div className="guide-videos">
        {EXAMPLE_VIDEOS.map((v) => (
          <div className="card guide-video-card" key={v.id}>
            {v.scenes ? (
              <GuideDemoPlayer scenes={v.scenes} poster={v.poster} />
            ) : (
              <div className="guide-video-placeholder">
                <span className="guide-video-placeholder-icon">▶</span>
                영상 준비 중이에요
              </div>
            )}
            <span className="chip guide-video-tag">{v.tag}</span>
            <div className="guide-video-title">{v.title}</div>
            <div className="guide-video-desc">{v.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
