import { useState, useMemo, useRef, useEffect } from "react";
import {
  Home, Users, MessageSquare, Plus, LogOut,
  ChevronDown, Moon, Sun, Search,
  X, Check, FileText, Sparkles, Upload, Bot, Send, ShieldCheck, ChevronRight, MoreHorizontal, HeartHandshake,
} from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type RelationType = "연인" | "친구" | "가족" | "직장";
type SortKey = "change" | "score-high" | "score-low" | "recent";
type Page = "dashboard" | "people" | "chat";
type ModalStep = 1 | 2 | 3 | "loading" | "done";

interface Person {
  id: number;
  name: string;
  initial: string;
  type: RelationType;
  score: number;
  change: number;
  lastUpdated: string;
  avatarColor: string;
  spark: { v: number }[];
  prqc: Record<string, number>;
  trend8w: { label: string; score: number }[];
  evidences: { component: string; value: number; text: string }[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const PEOPLE: Person[] = [
  {
    id: 1, name: "김지수", initial: "지", type: "연인",
    score: 82, change: 12, lastUpdated: "2026-08-19",
    avatarColor: "#C4858A",
    spark: [52, 58, 63, 70, 72, 78, 82].map(v => ({ v })),
    prqc: { 만족감: 80, 헌신: 85, 친밀감: 88, 신뢰: 90, 열정: 75, 애정: 82 },
    trend8w: [
      { label: "8주 전", score: 58 }, { label: "7주 전", score: 62 },
      { label: "6주 전", score: 65 }, { label: "5주 전", score: 68 },
      { label: "4주 전", score: 72 }, { label: "3주 전", score: 75 },
      { label: "지난주", score: 78 }, { label: "이번 주", score: 82 },
    ],
    evidences: [
      { component: "열정", value: 75, text: "대화 시작이 양방향으로 균형 있게 이루어지고 있는 것으로 관찰됐어요" },
    ],
  },
  {
    id: 2, name: "박민준", initial: "민", type: "친구",
    score: 58, change: -15, lastUpdated: "2026-08-18",
    avatarColor: "#8B85C4",
    spark: [75, 73, 70, 68, 65, 61, 58].map(v => ({ v })),
    prqc: { 만족감: 55, 헌신: 45, 친밀감: 68, 신뢰: 72, 열정: 40, 애정: 58 },
    trend8w: [
      { label: "8주 전", score: 75 }, { label: "7주 전", score: 73 },
      { label: "6주 전", score: 70 }, { label: "5주 전", score: 68 },
      { label: "4주 전", score: 65 }, { label: "3주 전", score: 62 },
      { label: "지난주", score: 60 }, { label: "이번 주", score: 58 },
    ],
    evidences: [
      { component: "열정", value: 40, text: "최근 한 달간 대화 빈도가 주 평균 3.2회에서 1.1회로 줄어든 것이 관찰됐어요" },
      { component: "헌신", value: 45, text: "답장까지 평균 소요 시간이 이전 달 대비 약 6배 증가한 것으로 나타났어요" },
    ],
  },
  {
    id: 3, name: "이수연", initial: "수", type: "가족",
    score: 91, change: 3, lastUpdated: "2026-08-19",
    avatarColor: "#C4A85A",
    spark: [87, 88, 88, 89, 90, 90, 91].map(v => ({ v })),
    prqc: { 만족감: 92, 헌신: 90, 친밀감: 95, 신뢰: 98, 열정: 78, 애정: 95 },
    trend8w: [
      { label: "8주 전", score: 87 }, { label: "7주 전", score: 88 },
      { label: "6주 전", score: 88 }, { label: "5주 전", score: 89 },
      { label: "4주 전", score: 90 }, { label: "3주 전", score: 90 },
      { label: "지난주", score: 90 }, { label: "이번 주", score: 91 },
    ],
    evidences: [
      { component: "열정", value: 78, text: "매우 안정적인 관계 패턴이 8주 이상 지속되고 있는 것으로 관찰됐어요" },
    ],
  },
  {
    id: 4, name: "최현우", initial: "현", type: "직장",
    score: 45, change: -22, lastUpdated: "2026-08-17",
    avatarColor: "#7A97C4",
    spark: [68, 65, 62, 57, 53, 49, 45].map(v => ({ v })),
    prqc: { 만족감: 35, 헌신: 48, 친밀감: 42, 신뢰: 55, 열정: 28, 애정: 38 },
    trend8w: [
      { label: "8주 전", score: 68 }, { label: "7주 전", score: 65 },
      { label: "6주 전", score: 62 }, { label: "5주 전", score: 57 },
      { label: "4주 전", score: 53 }, { label: "3주 전", score: 49 },
      { label: "지난주", score: 47 }, { label: "이번 주", score: 45 },
    ],
    evidences: [
      { component: "열정", value: 28, text: "최근 2주간 먼저 연락을 시작한 횟수가 눈에 띄게 줄어든 것으로 관찰됐어요" },
      { component: "만족감", value: 35, text: "대화 내 긍정적 표현 빈도가 4주 전 대비 약 38% 감소한 것으로 관찰됐어요" },
    ],
  },
  {
    id: 5, name: "정예린", initial: "예", type: "친구",
    score: 74, change: 8, lastUpdated: "2026-08-18",
    avatarColor: "#A485C4",
    spark: [64, 66, 68, 70, 71, 73, 74].map(v => ({ v })),
    prqc: { 만족감: 72, 헌신: 70, 친밀감: 78, 신뢰: 80, 열정: 65, 애정: 75 },
    trend8w: [
      { label: "8주 전", score: 64 }, { label: "7주 전", score: 66 },
      { label: "6주 전", score: 68 }, { label: "5주 전", score: 70 },
      { label: "4주 전", score: 71 }, { label: "3주 전", score: 72 },
      { label: "지난주", score: 73 }, { label: "이번 주", score: 74 },
    ],
    evidences: [
      { component: "열정", value: 65, text: "전주 대비 먼저 연락하는 빈도가 꾸준히 증가하고 있는 것으로 관찰됐어요" },
    ],
  },
  {
    id: 6, name: "한승호", initial: "승", type: "직장",
    score: 67, change: -5, lastUpdated: "2026-08-16",
    avatarColor: "#7AC4B8",
    spark: [72, 72, 71, 70, 69, 68, 67].map(v => ({ v })),
    prqc: { 만족감: 65, 헌신: 58, 친밀감: 60, 신뢰: 72, 열정: 55, 애정: 62 },
    trend8w: [
      { label: "8주 전", score: 72 }, { label: "7주 전", score: 72 },
      { label: "6주 전", score: 71 }, { label: "5주 전", score: 70 },
      { label: "4주 전", score: 69 }, { label: "3주 전", score: 68 },
      { label: "지난주", score: 68 }, { label: "이번 주", score: 67 },
    ],
    evidences: [
      { component: "헌신", value: 58, text: "대화 참여도가 소폭 감소하는 추세가 관찰됐어요. 일시적 패턴일 수 있어요" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return "#7B9E7A";
  if (score >= 60) return "#C08B8F";
  if (score >= 40) return "#D4882A";
  return "#E07A7A";
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "건강한 관계", color: "#7B9E7A" };
  if (score >= 60) return { label: "양호", color: "#C08B8F" };
  if (score >= 40) return { label: "주의 필요", color: "#D4882A" };
  return { label: "변화 감지", color: "#E07A7A" };
}

function formatDate(str: string): string {
  const d = new Date(str);
  const now = new Date("2026-08-19");
  const diff = Math.round((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  return `${diff}일 전`;
}

function sortPeople(people: Person[], key: SortKey): Person[] {
  return [...people].sort((a, b) => {
    switch (key) {
      case "change":     return Math.abs(b.change) - Math.abs(a.change);
      case "score-high": return b.score - a.score;
      case "score-low":  return a.score - b.score;
      case "recent":     return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    }
  });
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "change",     label: "변화가 큰 순" },
  { key: "score-high", label: "점수 높은 순" },
  { key: "score-low",  label: "점수 낮은 순" },
  { key: "recent",     label: "최근 업데이트 순" },
];

const TYPE_STYLE: Record<RelationType, { bg: string; text: string; border: string }> = {
  "연인": { bg: "#FFF0F2", text: "#C0586A", border: "#FAD4DA" },
  "친구": { bg: "#F3F0FF", text: "#7B6CC4", border: "#DDD8F5" },
  "가족": { bg: "#FFF8EC", text: "#B87A1A", border: "#F5DFB0" },
  "직장": { bg: "#EFF5FF", text: "#4A7AC4", border: "#CCDEf4" },
};

const AVG_SCORE = Math.round(PEOPLE.reduce((s, p) => s + p.score, 0) / PEOPLE.length);

// ─── Shared Components ────────────────────────────────────────────────────────

function ScoreRing({ score, size = 72, sw = 5 }: { score: number; size?: number; sw?: number }) {
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = getScoreColor(score);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ color, fontFamily: "'DM Mono', monospace", fontSize: size * 0.24, fontWeight: 700, lineHeight: 1 }}>
          {score}
        </span>
      </div>
    </div>
  );
}

function SortDropdown({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const current = SORT_OPTIONS.find(o => o.key === value)!;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border text-sm text-card-foreground bg-card hover:bg-muted transition-colors">
        {current.label}
        <ChevronDown size={13} className="text-muted-foreground" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-card border border-border rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] py-1 z-20 min-w-[160px]">
          {SORT_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => { onChange(opt.key); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${value === opt.key ? "text-primary font-medium bg-secondary" : "text-card-foreground hover:bg-muted"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniSparkline({ data, isUp }: { data: { v: number }[]; isUp: boolean }) {
  return (
    <div style={{ height: 28, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke={isUp ? "#7B9E7A" : "#E07A7A"} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <p className="font-bold" style={{ color: getScoreColor(payload[0].value), fontFamily: "'DM Mono', monospace" }}>{payload[0].value}점</p>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ activePage, setActivePage, darkMode, setDarkMode, onNewPerson }: {
  activePage: Page; setActivePage: (p: Page) => void;
  darkMode: boolean; setDarkMode: (d: boolean) => void; onNewPerson: () => void;
}) {
  const navItems = [
    { key: "dashboard" as Page, label: "메인 대시보드", Icon: Home },
    { key: "people"    as Page, label: "인물별 관계",   Icon: Users },
    { key: "chat"      as Page, label: "AI 챗봇",        Icon: MessageSquare },
  ];
  return (
    <aside className="w-60 flex flex-col h-screen bg-sidebar border-r flex-shrink-0" style={{ borderColor: "var(--sidebar-border)" }}>
      <div className="px-5 pt-6 pb-5 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: "linear-gradient(135deg,#C08B8F 0%,#D4A0A4 100%)" }}>🌡️</div>
          <div>
            <span className="text-base font-bold text-sidebar-foreground tracking-tight">관계온도</span>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Relationship Health</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setActivePage(key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${activePage === key ? "bg-secondary text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-sidebar-foreground"}`}>
            <Icon size={17} />{label}
          </button>
        ))}
      </nav>
      <div className="px-3 pb-2">
        <button onClick={() => setDarkMode(!darkMode)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-sidebar-foreground transition-all duration-150">
          {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          {darkMode ? "라이트 모드" : "다크 모드"}
        </button>
      </div>
      <div className="px-3 pt-3 pb-5 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{ background: "linear-gradient(135deg,#C08B8F,#D4A0A4)", color: "#fff" }}>나</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">김나영</p>
            <p className="text-xs text-muted-foreground">내 계정 관리</p>
          </div>
          <button className="text-muted-foreground hover:text-sidebar-foreground transition-colors p-1 rounded-lg hover:bg-muted">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── Dashboard Page (화면 1) ──────────────────────────────────────────────────

function PersonCard({ person }: { person: Person }) {
  const isUp = person.change > 0;
  const { label, color } = getScoreLabel(person.score);
  const typeS = TYPE_STYLE[person.type];
  return (
    <div className="bg-card rounded-2xl p-5 border border-border cursor-pointer select-none transition-all duration-200 ease-out hover:shadow-[0_8px_32px_rgba(0,0,0,0.09)] hover:-translate-y-0.5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
          style={{ backgroundColor: person.avatarColor + "22", color: person.avatarColor }}>{person.initial}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-card-foreground leading-tight">{person.name}</p>
          <span className="inline-block text-xs font-medium px-1.5 py-0.5 rounded-md border mt-1"
            style={{ backgroundColor: typeS.bg, color: typeS.text, borderColor: typeS.border }}>{person.type}</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-[2.375rem] font-bold leading-none tracking-tight"
              style={{ color: getScoreColor(person.score), fontFamily: "'DM Mono', monospace" }}>{person.score}</span>
            <span className="text-xs text-muted-foreground mb-0.5">점</span>
          </div>
          <p className="text-xs font-medium mt-0.5" style={{ color }}>{label}</p>
          <div className="flex items-center gap-0.5 mt-2 text-xs font-semibold" style={{ color: isUp ? "#7B9E7A" : "#E07A7A" }}>
            <span>{isUp ? "▲" : "▼"}</span>
            <span style={{ fontFamily: "'DM Mono', monospace" }}>{Math.abs(person.change)}</span>
            <span className="text-muted-foreground font-normal ml-1">지난주 대비</span>
          </div>
        </div>
        <ScoreRing score={person.score} size={72} sw={5} />
      </div>
      <div className="mt-4 pt-3.5 border-t border-border">
        <p className="text-xs text-muted-foreground">마지막 분석 <span className="font-medium text-card-foreground">{formatDate(person.lastUpdated)}</span></p>
      </div>
    </div>
  );
}

function DashboardPage({ onNewPerson, darkMode }: { onNewPerson: () => void; darkMode: boolean }) {
  const [sortKey, setSortKey] = useState<SortKey>("change");
  const sorted = useMemo(() => sortPeople(PEOPLE, sortKey), [sortKey]);
  const bigChanges = useMemo(() => [...PEOPLE].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 3), []);
  const needsAttention = useMemo(() => PEOPLE.filter(p => p.score < 60 || p.change <= -10), []);

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-8 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[1.625rem] font-bold text-foreground tracking-tight leading-tight">이번 주 나의 관계 온도</h1>
            <p className="text-sm text-muted-foreground mt-1.5">2026년 8월 3주차 &nbsp;·&nbsp; 등록된 관계 <span className="font-semibold text-foreground">{PEOPLE.length}명</span></p>
          </div>
          <button onClick={onNewPerson}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90 hover:shadow-md active:scale-95"
            style={{ background: "linear-gradient(135deg,#C08B8F 0%,#C4858A 100%)" }}>
            <Plus size={15} />새 인물 등록
          </button>
        </div>
        <div className="flex gap-6 items-start">
          <div className="flex-[2] min-w-0">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">총 <span className="font-semibold text-foreground">{PEOPLE.length}개</span>의 관계</p>
              <SortDropdown value={sortKey} onChange={setSortKey} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {sorted.map(person => <PersonCard key={person.id} person={person} />)}
            </div>
          </div>
          <div className="w-[272px] flex-shrink-0 space-y-4">
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px]" style={{ background: "#C08B8F22", color: "#C08B8F" }}>↕</span>
                이번 주 변화가 큰 관계
              </h3>
              <div className="space-y-4">
                {bigChanges.map(p => {
                  const isUp = p.change > 0;
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ backgroundColor: p.avatarColor + "22", color: p.avatarColor }}>{p.initial}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-semibold text-card-foreground">{p.name}</span>
                          <span className="text-xs font-bold" style={{ color: isUp ? "#7B9E7A" : "#E07A7A", fontFamily: "'DM Mono', monospace" }}>{isUp ? "▲" : "▼"}{Math.abs(p.change)}</span>
                        </div>
                        <MiniSparkline data={p.spark} isUp={isUp} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border p-5" style={{ background: darkMode ? "#2D2415" : "#FDF6ED", borderColor: darkMode ? "#4A3B22" : "#F0DEC0" }}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: darkMode ? "#E8A84A" : "#92600A" }}>
                <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px]" style={{ background: "#D4882A22", color: "#D4882A" }}>⚡</span>
                주의가 필요한 관계
              </h3>
              <div className="space-y-3">
                {needsAttention.map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ backgroundColor: p.avatarColor + "22", color: p.avatarColor }}>{p.initial}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-card-foreground">{p.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#D4882A" }}>{p.score < 50 ? "점수 급감 관찰됨" : "변화 감지 · 모니터링 권장"}</p>
                    </div>
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: "#D4882A", fontFamily: "'DM Mono', monospace" }}>{p.score}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-border p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">전체 관계 평균 점수</p>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-[3.25rem] font-bold leading-none tracking-tight" style={{ color: getScoreColor(AVG_SCORE), fontFamily: "'DM Mono', monospace" }}>{AVG_SCORE}</span>
                <span className="text-base text-muted-foreground pb-1.5">/ 100</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{PEOPLE.length}개의 관계 기준 · 2026년 8월 3주차</p>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${AVG_SCORE}%`, background: `linear-gradient(90deg,${getScoreColor(AVG_SCORE)} 0%,${getScoreColor(AVG_SCORE)}CC 100%)` }} />
              </div>
              <div className="mt-4 space-y-1.5">
                {[{ range: "80–100", label: "건강한 관계", color: "#7B9E7A" }, { range: "60–79", label: "양호", color: "#C08B8F" }, { range: "40–59", label: "주의 필요", color: "#D4882A" }].map(item => (
                  <div key={item.range} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{item.range}</span>
                    <span className="text-[11px] text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── People Page (화면 2) ─────────────────────────────────────────────────────

function PersonReport({ person, darkMode, onConsult }: { person: Person; darkMode: boolean; onConsult: () => void }) {
  const typeS = TYPE_STYLE[person.type];
  const { label, color } = getScoreLabel(person.score);
  const isUp = person.change > 0;
  const radarData = Object.entries(person.prqc).map(([subject, score]) => ({ subject, score }));

  const RadarTick = ({ x, y, payload }: any) => {
    const item = radarData.find(d => d.subject === payload.value);
    const s = item?.score ?? 0;
    const c = getScoreColor(s);
    return (
      <g transform={`translate(${x},${y})`}>
        <text textAnchor="middle" dominantBaseline="central" dy={-7}
          style={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "'Noto Sans KR', sans-serif" }}>
          {payload.value}
        </text>
        <text textAnchor="middle" dominantBaseline="central" dy={8}
          style={{ fill: c, fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
          {s}
        </text>
      </g>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="px-8 py-7 max-w-[900px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
              style={{ backgroundColor: person.avatarColor + "22", color: person.avatarColor }}>{person.initial}</div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{person.name}</h2>
                <span className="text-sm font-medium px-2.5 py-0.5 rounded-lg border"
                  style={{ backgroundColor: typeS.bg, color: typeS.text, borderColor: typeS.border }}>{person.type}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">마지막 분석 {formatDate(person.lastUpdated)}</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-card-foreground bg-card hover:bg-muted transition-colors">
            <Plus size={15} />대화 내역 추가
          </button>
        </div>

        {/* Score + Radar row */}
        <div className="flex gap-5 mb-5">
          {/* Left: large gauge + 4-week mini trend */}
          <div className="w-[240px] flex-shrink-0 bg-card rounded-2xl border border-border p-6 flex flex-col items-center">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-4">종합 점수</p>
            <ScoreRing score={person.score} size={144} sw={11} />
            <p className="text-sm font-semibold mt-3" style={{ color }}>{label}</p>
            <div className="flex items-center gap-1 mt-1 text-sm font-bold" style={{ color: isUp ? "#7B9E7A" : "#E07A7A" }}>
              <span>{isUp ? "▲" : "▼"}</span>
              <span style={{ fontFamily: "'DM Mono', monospace" }}>{Math.abs(person.change)}</span>
              <span className="text-muted-foreground font-normal text-xs ml-1">지난주 대비</span>
            </div>
            {/* 4-week sparkline */}
            <div className="w-full mt-5 pt-4 border-t border-border">
              <p className="text-[11px] text-muted-foreground mb-2">최근 4주 추이</p>
              <div style={{ height: 44 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={person.trend8w.slice(-4)} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <Line type="monotone" dataKey="score" stroke={getScoreColor(person.score)} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between mt-1">
                {person.trend8w.slice(-4).map((d, i) => (
                  <span key={i} style={{ fontSize: 10, color: "var(--muted-foreground)", fontFamily: "'DM Mono', monospace" }}>{d.score}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: radar chart + evidence cards */}
          <div className="flex-1 bg-card rounded-2xl border border-border p-6">
            <div className="flex items-baseline gap-2 mb-1">
              <p className="text-sm font-semibold text-card-foreground">PRQC 구성요소 분석</p>
              <p className="text-xs text-muted-foreground">6개 요소 · 0–100점</p>
            </div>
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 16, right: 44, bottom: 16, left: 44 }}>
                  <PolarGrid stroke={darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"} />
                  <PolarAngleAxis dataKey="subject" tick={RadarTick} tickLine={false} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickLine={false} />
                  <Radar dataKey="score" stroke="#C08B8F" fill="#C08B8F" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Evidence cards */}
            {person.evidences.length > 0 && (
              <div className="mt-3 pt-4 border-t border-border">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">근거 — 개선 가능 요소</p>
                <div className="space-y-2">
                  {person.evidences.map((ev, i) => (
                    <div key={i} className="rounded-xl p-3.5 border flex gap-3"
                      style={{ background: darkMode ? "rgba(255,255,255,0.03)" : "#FAF7F4", borderColor: "var(--border)" }}>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mt-0.5"
                        style={{ background: "#D4882A18", color: "#C08B8F" }}>"</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold" style={{ color: getScoreColor(ev.value) }}>{ev.component}</span>
                          <span className="text-xs" style={{ color: getScoreColor(ev.value), fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{ev.value}점</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{ev.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 8-week trend chart — full width */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-card-foreground">시간에 따른 변화</p>
            <span className="text-xs text-muted-foreground">지난 8주 추이</span>
          </div>
          <p className="text-xs text-muted-foreground mb-5">주차별 종합 점수 변화를 보여줘요</p>
          <div style={{ height: 175 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={person.trend8w} margin={{ top: 5, right: 12, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "'Noto Sans KR', sans-serif" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} width={28} ticks={[0, 25, 50, 75, 100]} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="score" stroke={getScoreColor(person.score)} strokeWidth={2.5}
                  dot={{ fill: getScoreColor(person.score), r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: getScoreColor(person.score), strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI consultation CTA */}
        <button onClick={onConsult}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:shadow-lg active:scale-[0.99]"
          style={{ background: "linear-gradient(135deg,#C08B8F 0%,#C4858A 100%)", color: "#fff" }}>
          <Sparkles size={17} />
          {person.name}와의 관계, AI와 깊이 상담해 보세요
        </button>
      </div>
    </div>
  );
}

function PeoplePage({ darkMode, setActivePage }: { darkMode: boolean; setActivePage: (p: Page) => void }) {
  const [selectedId, setSelectedId] = useState<number>(4);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return PEOPLE;
    return PEOPLE.filter(p => p.name.includes(query.trim()));
  }, [query]);

  const selected = PEOPLE.find(p => p.id === selectedId) ?? PEOPLE[0];

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Person list */}
      <div className="w-[280px] flex-shrink-0 border-r border-border flex flex-col bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--muted)" }}>
            <Search size={14} className="text-muted-foreground flex-shrink-0" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="이름으로 검색"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">검색 결과 없음</p>}
          {filtered.map(p => {
            const isSelected = p.id === selectedId;
            const isUp = p.change > 0;
            const typeS = TYPE_STYLE[p.type];
            return (
              <button key={p.id} onClick={() => setSelectedId(p.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-150 relative ${isSelected ? "bg-secondary" : "hover:bg-muted"}`}>
                {isSelected && (
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full" style={{ backgroundColor: "var(--primary)" }} />
                )}
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: p.avatarColor + "22", color: p.avatarColor }}>{p.initial}</div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>{p.name}</span>
                    <span className="text-[10px] font-medium px-1 py-0.5 rounded border flex-shrink-0"
                      style={{ backgroundColor: typeS.bg, color: typeS.text, borderColor: typeS.border }}>{p.type}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: getScoreColor(p.score) }}>{p.score}</span>
                    <span className="text-[10px] font-semibold" style={{ color: isUp ? "#7B9E7A" : "#E07A7A" }}>{isUp ? "▲" : "▼"}{Math.abs(p.change)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <PersonReport person={selected} darkMode={darkMode} onConsult={() => setActivePage("chat")} />
    </div>
  );
}

// ─── Registration Modal (화면 3) ──────────────────────────────────────────────

const REL_TYPES = ["연인", "친구", "가족", "직장동료", "기타"] as const;
type RegRelType = typeof REL_TYPES[number];

const LOAD_STEPS = ["대화 파일 불러오기", "메시지 패턴 분석", "감정 흐름 파악", "PRQC 점수 계산", "관계 온도 측정"];

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["관계 정보", "대화 업로드", "체크인"];
  return (
    <div className="flex items-start justify-center mb-8 gap-0">
      {steps.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={num} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300`}
                style={done ? { background: "#7B9E7A", color: "#fff" } : active ? { background: "linear-gradient(135deg,#C08B8F,#D4A0A4)", color: "#fff" } : { background: "var(--muted)", color: "var(--muted-foreground)" }}>
                {done ? <Check size={14} /> : num}
              </div>
              <span className="text-xs font-medium whitespace-nowrap" style={{ color: active ? "var(--primary)" : "var(--muted-foreground)" }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-16 h-px mx-2 mt-[-12px]" style={{ background: num < current ? "#7B9E7A" : "var(--border)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RegistrationModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<ModalStep>(1);
  const [name, setName] = useState("");
  const [relType, setRelType] = useState<RegRelType | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [slider1, setSlider1] = useState(4);
  const [slider2, setSlider2] = useState(4);
  const [loadProgress, setLoadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== "loading") return;
    let p = 0;
    const timer = setInterval(() => {
      p += 1.8;
      setLoadProgress(Math.min(100, p));
      if (p >= 100) { clearInterval(timer); setTimeout(() => setStep("done"), 400); }
    }, 45);
    return () => clearInterval(timer);
  }, [step]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setUploadedFile({ name: file.name, size: `${(file.size / 1024).toFixed(1)} KB` });
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile({ name: file.name, size: `${(file.size / 1024).toFixed(1)} KB` });
  };

  const currentLoadStep = Math.min(Math.floor(loadProgress / 20), LOAD_STEPS.length - 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}>
      <div className="bg-card rounded-2xl w-[600px] shadow-2xl relative overflow-hidden" style={{ maxHeight: "92vh", overflowY: "auto" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-0">
          <div>
            <h2 className="text-lg font-bold text-card-foreground">새 인물 등록</h2>
            {typeof step === "number" && step <= 3 && (
              <p className="text-xs text-muted-foreground mt-0.5">{step}단계 / 3단계</p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-8 py-7">
          {typeof step === "number" && step <= 3 && <StepIndicator current={step as 1 | 2 | 3} />}

          {/* Step 1: Relation info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-card-foreground mb-2">이름</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동"
                  className="w-full px-4 py-3 rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                  style={{ background: "var(--muted)" }} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-card-foreground mb-3">관계 유형</label>
                <div className="flex flex-wrap gap-2">
                  {REL_TYPES.map(t => {
                    const active = relType === t;
                    return (
                      <button key={t} onClick={() => setRelType(t)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-150`}
                        style={active
                          ? { borderColor: "var(--primary)", color: "var(--primary)", background: "var(--secondary)" }
                          : { borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: File upload */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-card-foreground mb-1">카카오톡 대화 파일 업로드</p>
                <p className="text-xs text-muted-foreground mb-4">카카오톡 대화방 → 메뉴 → 대화 내용 내보내기로 파일을 받을 수 있어요</p>
              </div>
              {!uploadedFile ? (
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-150"
                  style={{ borderColor: isDragging ? "#C08B8F" : "var(--border)", background: isDragging ? "var(--secondary)" : "var(--muted)" }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--card)" }}>
                    <Upload size={22} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-card-foreground mb-1 text-center">파일을 여기로 끌어다 놓거나 클릭하여 업로드</p>
                  <p className="text-xs text-muted-foreground mb-4">.txt 형식 · 최대 50MB</p>
                  <button className="text-xs underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: "var(--primary)" }}
                    onClick={e => e.stopPropagation()}>카카오톡 대화 내보내기 방법 보기 →</button>
                  <input ref={fileInputRef} type="file" accept=".txt" className="hidden" onChange={handleFileChange} />
                </div>
              ) : (
                <div className="rounded-2xl border border-border p-5 flex items-center gap-4" style={{ background: "var(--secondary)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--card)" }}>
                    <FileText size={18} style={{ color: "var(--primary)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-card-foreground truncate">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{uploadedFile.size}</p>
                  </div>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#7B9E7A" }}>
                    <Check size={14} className="text-white" />
                  </div>
                  <button onClick={() => setUploadedFile(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Check-in */}
          {step === 3 && (
            <div className="space-y-8">
              {[
                { q: "요즘 이 사람과의 관계, 어떻게 느껴지세요?", left: "많이 불편해요", right: "매우 좋아요", val: slider1, set: setSlider1 },
                { q: "최근 이 사람과 대화할 때 얼마나 편안함을 느끼시나요?", left: "전혀 편안하지 않아요", right: "매우 편안해요", val: slider2, set: setSlider2 },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-card-foreground mb-5">{item.q}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-[88px] text-right flex-shrink-0 leading-tight">{item.left}</span>
                    <div className="flex-1">
                      <input type="range" min="1" max="7" value={item.val}
                        onChange={e => item.set(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: "#C08B8F" }} />
                      <div className="flex justify-between mt-2 px-0.5">
                        {[1, 2, 3, 4, 5, 6, 7].map(n => (
                          <span key={n} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: n === item.val ? "#C08B8F" : "var(--muted-foreground)", fontWeight: n === item.val ? 700 : 400 }}>{n}</span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-[88px] flex-shrink-0 leading-tight">{item.right}</span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-center pt-1 leading-relaxed">
                이 질문은 앞으로 매주 짧게 다시 물어볼 거예요. 변화 추이를 함께 추적해 드릴게요.
              </p>
            </div>
          )}

          {/* Loading state */}
          {step === "loading" && (
            <div className="flex flex-col items-center py-8">
              <div className="relative w-20 h-20 mb-6">
                <svg className="w-full h-full" viewBox="0 0 80 80"
                  style={{ animation: "spin 2s linear infinite" }}>
                  <style>{`@keyframes spin { from { transform: rotate(-90deg); } to { transform: rotate(270deg); } }`}</style>
                  <circle cx="40" cy="40" r="34" fill="none" stroke="var(--muted)" strokeWidth="5" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#C08B8F" strokeWidth="5"
                    strokeDasharray={`${2 * Math.PI * 34 * loadProgress / 100} ${2 * Math.PI * 34}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: "#C08B8F" }}>{Math.floor(loadProgress)}%</span>
                </div>
              </div>
              <h3 className="text-base font-bold text-card-foreground mb-1">대화를 분석하고 있어요</h3>
              <p className="text-sm text-muted-foreground mb-8">잠시만 기다려 주세요, 보통 20–30초 정도 걸려요</p>
              <div className="w-full space-y-2.5">
                {LOAD_STEPS.map((s, i) => {
                  const done = i < currentLoadStep;
                  const active = i === currentLoadStep;
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                        style={{ background: done ? "#7B9E7A" : active ? "#C08B8F22" : "var(--muted)" }}>
                        {done ? <Check size={11} className="text-white" /> :
                          active ? <div className="w-2 h-2 rounded-full" style={{ background: "#C08B8F", animation: "pulse 1s ease-in-out infinite" }} /> :
                          <div className="w-2 h-2 rounded-full" style={{ background: "var(--border)" }} />}
                      </div>
                      <span className="text-sm" style={{ color: done ? "#7B9E7A" : active ? "var(--card-foreground)" : "var(--muted-foreground)", fontWeight: active ? 600 : 400 }}>{s}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Done state */}
          {step === "done" && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: "#7B9E7A22" }}>
                <Check size={28} style={{ color: "#7B9E7A" }} />
              </div>
              <h3 className="text-lg font-bold text-card-foreground mb-2">분석 완료!</h3>
              <p className="text-sm text-muted-foreground mb-1">{name || "새 인물"}의 관계 온도가 측정됐어요</p>
              <p className="text-xs text-muted-foreground mb-8">첫 번째 리포트가 생성되었어요. 인물별 관계 페이지에서 확인해보세요.</p>
              <button onClick={() => { onDone(); onClose(); }}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#C08B8F 0%,#C4858A 100%)" }}>
                리포트 확인하기
              </button>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        {typeof step === "number" && step <= 3 && (
          <div className="px-8 pb-7 flex items-center justify-between">
            <button onClick={() => typeof step === "number" && step > 1 ? setStep((step - 1) as ModalStep) : onClose()}
              className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              {step === 1 ? "취소" : "이전"}
            </button>
            <button
              onClick={() => typeof step === "number" && (step < 3 ? setStep((step + 1) as ModalStep) : setStep("loading"))}
              disabled={step === 1 && (!name.trim() || !relType)}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg,#C08B8F 0%,#C4858A 100%)" }}>
              {step === 3 ? "분석 시작하기" : "다음"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI Chat Consultation (화면 4) ───────────────────────────────────────────

type ChatRoom = {
  id: number;
  name: string;
  initial: string;
  relation: RelationType;
  avatarColor: string;
  preview: string;
  time: string;
  unread?: boolean;
};

type ChatMessage = {
  id: number;
  sender: "ai" | "user";
  body: string;
  time: string;
};

const CHAT_ROOMS: ChatRoom[] = [
  { id: 1, name: "김지수", initial: "지", relation: "연인", avatarColor: "#C4858A", preview: "그렇게 느낀 데에는 충분한 이유가 있어요.", time: "방금", unread: true },
  { id: 2, name: "박민준", initial: "민", relation: "친구", avatarColor: "#8B85C4", preview: "관계를 바로 정의하기보다, 흐름을 지켜봐도 좋아요.", time: "어제" },
  { id: 3, name: "최현우", initial: "현", relation: "직장", avatarColor: "#7A97C4", preview: "업무 대화의 경계를 정리해볼 수 있어요.", time: "8/17" },
  { id: 4, name: "이수연", initial: "수", relation: "가족", avatarColor: "#C4A85A", preview: "편안한 관계감이 꾸준히 관찰되고 있어요.", time: "8/15" },
];

const INITIAL_CHAT: ChatMessage[] = [
  { id: 1, sender: "ai", body: "지수님과의 관계에서 어떤 점이 가장 마음에 남아 있나요?\n최근 대화 데이터를 함께 살펴보며 천천히 이야기해볼게요.", time: "오후 8:42" },
  { id: 2, sender: "user", body: "요즘은 전보다 가까워진 것 같은데, 가끔 답장이 늦으면 제가 너무 불안해져요.", time: "오후 8:44" },
  { id: 3, sender: "ai", body: "그럴 수 있어요. 친밀감이 커질수록 작은 변화도 더 크게 느껴지곤 하니까요.\n\n제가 볼 수 있는 건 대화 속 패턴뿐이라 확정해서 말씀드리긴 어려워요. 다만 최근 대화에서 회피성 답변이 반복된 건 관찰돼요.", time: "오후 8:45" },
  { id: 4, sender: "user", body: "그럼 제가 먼저 대화를 꺼내는 게 부담스러울까요?", time: "오후 8:47" },
  { id: 5, sender: "ai", body: "먼저 대화를 꺼내는 것 자체가 부담이라고 보이진 않아요. 최근 4주간 지수님도 대화의 46%를 먼저 시작한 것으로 보여요.\n\n다만 답장이 늦는 순간에 어떤 생각이 떠오르는지, 그 마음을 짧고 솔직하게 나눠보는 건 관계를 이해하는 데 도움이 될 수 있어요.", time: "오후 8:48" },
];

function ChatPage() {
  const [selectedRoom, setSelectedRoom] = useState(1);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [draft, setDraft] = useState("");
  const [showResources, setShowResources] = useState(false);
  const room = CHAT_ROOMS.find(item => item.id === selectedRoom) ?? CHAT_ROOMS[0];

  const sendMessage = (text = draft) => {
    const clean = text.trim();
    if (!clean) return;
    setMessages(prev => [...prev, { id: Date.now(), sender: "user", body: clean, time: "지금" }]);
    setDraft("");
    window.setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: "ai",
        body: "그 마음을 알아차린 것만으로도 중요한 시작일 수 있어요. 조금 더 구체적으로, 어떤 순간에 가장 불안해지는지 함께 살펴볼까요?",
        time: "지금",
      }]);
    }, 550);
  };

  const startNewConsultation = () => {
    setSelectedRoom(1);
    setMessages([{ id: Date.now(), sender: "ai", body: "새로운 상담을 시작했어요. 지금 가장 이야기하고 싶은 관계의 순간을 들려주세요.", time: "지금" }]);
  };

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden bg-background">
      <aside className="w-[280px] shrink-0 border-r border-border bg-card flex flex-col max-[1000px]:w-[230px]">
        <div className="p-4 border-b border-border">
          <button onClick={startNewConsultation} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_5px_14px_rgba(192,139,143,0.2)] transition-all hover:-translate-y-px hover:shadow-[0_7px_18px_rgba(192,139,143,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Plus size={17} strokeWidth={2.3} /> 새 상담 시작
          </button>
        </div>
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">최근 상담</p>
          <button className="text-muted-foreground transition-colors hover:text-foreground" aria-label="상담 목록 더보기"><MoreHorizontal size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {CHAT_ROOMS.map(item => {
            const selected = item.id === selectedRoom;
            return (
              <button key={item.id} onClick={() => setSelectedRoom(item.id)} className={`group relative mb-1 flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-all ${selected ? "bg-secondary" : "hover:bg-muted"}`}>
                {selected && <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full bg-primary" />}
                <div className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: `${item.avatarColor}25`, color: item.avatarColor }}>
                  {item.initial}
                  {item.unread && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-semibold ${selected ? "text-primary" : "text-card-foreground"}`}>{item.name}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{item.time}</span>
                  </div>
                  <p className="mt-1 truncate text-xs leading-5 text-muted-foreground">{item.preview}</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="m-3 rounded-xl border border-border bg-muted/50 p-3.5 max-[1000px]:hidden">
          <div className="flex gap-2.5">
            <div className="mt-0.5 rounded-lg bg-[rgba(123,158,122,0.16)] p-1.5 text-[#668565]"><ShieldCheck size={15} /></div>
            <p className="text-[11px] leading-5 text-muted-foreground">대화 내용은 관계 패턴을 살피는 데에만 사용돼요.</p>
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="flex h-[88px] shrink-0 items-center justify-between border-b border-border bg-card px-8 max-[1000px]:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: `${room.avatarColor}25`, color: room.avatarColor }}>{room.initial}</div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-card-foreground">{room.name}님</h1>
                <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-primary">{room.relation}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{room.name}님과의 대화 데이터 기반 상담</p>
            </div>
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="상담 설정"><MoreHorizontal size={19} /></button>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-8 max-[1000px]:px-5">
          <div className="mx-auto flex w-full max-w-[700px] flex-col gap-5">
            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-border" /><span className="text-[11px] text-muted-foreground">오늘</span><span className="h-px flex-1 bg-border" />
            </div>
            {messages.slice(0, 3).map(message => <ChatBubble key={message.id} message={message} />)}
            <ResourceCard open={showResources} onToggle={() => setShowResources(prev => !prev)} />
            {messages.slice(3).map(message => <ChatBubble key={message.id} message={message} />)}
          </div>
        </main>

        <footer className="shrink-0 border-t border-border bg-card px-8 pb-6 pt-4 max-[1000px]:px-5">
          <div className="mx-auto max-w-[700px]">
            <div className="mb-3 flex flex-wrap gap-2">
              {["요즘 좀 나아진 것 같아", "이 관계 계속 유지해도 될까?", "내 마음을 어떻게 전하면 좋을까?"].map(chip => (
                <button key={chip} onClick={() => sendMessage(chip)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-secondary hover:text-primary">{chip}</button>
              ))}
            </div>
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 pl-4 shadow-[0_2px_10px_rgba(69,51,46,0.04)] focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
              <textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="마음을 편하게 적어주세요" rows={1} className="max-h-24 flex-1 resize-none bg-transparent py-2 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground" />
              <button onClick={() => sendMessage()} disabled={!draft.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35" aria-label="메시지 보내기"><Send size={17} /></button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">AI 상담은 관계를 단정하거나 진단하지 않아요.</p>
          </div>
        </footer>
      </section>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const ai = message.sender === "ai";
  return (
    <div className={`flex gap-2.5 ${ai ? "justify-start" : "justify-end"}`}>
      {ai && <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(123,158,122,0.15)] text-[#668565]"><Bot size={15} /></div>}
      <div className={`max-w-[82%] ${ai ? "items-start" : "items-end"} flex flex-col`}>
        {ai && <span className="mb-1 ml-1 text-[10px] font-semibold text-muted-foreground">관계온도 AI</span>}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${ai ? "rounded-tl-md bg-[#EEF4F0] text-[#38433A] dark:bg-[#314138] dark:text-[#E0ECE1]" : "rounded-tr-md bg-primary text-primary-foreground"}`}>
          {message.body.split("\n").map((line, index) => <p key={index} className={index ? "mt-3" : ""}>{line}</p>)}
        </div>
        <span className="mt-1 px-1 text-[10px] text-muted-foreground">{message.time}</span>
      </div>
    </div>
  );
}

function ResourceCard({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="my-1 rounded-2xl border border-[#E8D8B5] bg-[#FFF9EB] p-4 dark:border-[#715B35] dark:bg-[#3B3221]">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3D99B] text-[#9A6A17] dark:bg-[#5B4723] dark:text-[#F2CF7C]"><HeartHandshake size={18} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-[0.08em] text-[#9A6A17] dark:text-[#F2CF7C]">마음을 돌보는 제안</p>
          <p className="mt-1.5 text-sm leading-6 text-[#625036] dark:text-[#E8DAC3]">이런 패턴이 반복된다면 전문 상담사와 이야기 나눠보는 것도 방법이 될 수 있어요.</p>
          <button onClick={onToggle} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#9A6A17] transition-colors hover:text-[#754C08] dark:text-[#F2CF7C]">
            상담 리소스 보기 <ChevronRight size={14} className={open ? "rotate-90 transition-transform" : "transition-transform"} />
          </button>
          {open && <div className="mt-3 rounded-xl bg-white/65 px-3 py-2.5 text-xs leading-5 text-[#6B5A3D] dark:bg-black/15 dark:text-[#E8DAC3]">지역 정신건강복지센터, 청소년·성인 심리상담 안내 등 믿을 수 있는 지원 정보를 차분히 살펴볼 수 있어요.</div>}
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [activePage, setActivePage] = useState<Page>("chat");
  const [darkMode, setDarkMode] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { document.documentElement.classList.toggle("dark", darkMode); }, [darkMode]);

  return (
    <div className="flex h-screen bg-background overflow-hidden" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onNewPerson={() => setShowModal(true)}
      />

      {activePage === "dashboard" && <DashboardPage onNewPerson={() => setShowModal(true)} darkMode={darkMode} />}
      {activePage === "people"    && <PeoplePage darkMode={darkMode} setActivePage={setActivePage} />}
      {activePage === "chat"      && <ChatPage />}

      {showModal && (
        <RegistrationModal
          onClose={() => setShowModal(false)}
          onDone={() => setActivePage("people")}
        />
      )}
    </div>
  );
}
