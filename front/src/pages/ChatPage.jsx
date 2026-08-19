import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  listConsultations,
  listMessages,
  sendMessage as sendMessageApi,
  openMessageStream,
} from '../api/consultations';
import { fetchSupportResources } from '../api/supportResources';
import { avatarGradientFor, initialsOf } from '../utils/avatar';
import { MiniAstronaut } from '../components/Astronaut';
import { SendIcon, WarnIcon } from '../components/Icons';
import './Chat.css';

const SUGGESTED_QUESTIONS = ['요즘 좀 나아진 것 같아', '이 관계 계속 유지해도 될까?', '요즘 대화가 눈에 띄게 줄어든 것 같아'];

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  useEffect(() => {
    listConsultations()
      .then(setRooms)
      .finally(() => setRoomsLoading(false));
  }, []);

  if (!roomsLoading && !id && rooms.length > 0) {
    return <Navigate to={`/chat/${rooms[0].id}`} replace />;
  }

  return (
    <section className="chat-shell">
      <aside className="rooms-panel">
        <div className="rooms-panel-title">상담 기록</div>
        {!roomsLoading && rooms.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 4px' }}>
            아직 상담이 없어요. 인물별 리포트에서 &quot;AI와 상담하기&quot;로 시작해 보세요.
          </p>
        )}
        {rooms.map((r) => (
          <button
            key={r.id}
            className={`room-item ${r.id === id ? 'active' : ''}`}
            onClick={() => navigate(`/chat/${r.id}`)}
          >
            <div className="room-avatar" style={{ background: avatarGradientFor(r.relationship.id) }}>
              {r.relationship.initial || initialsOf(r.relationship.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="room-name-row">
                <span className="room-name">{r.relationship.name}</span>
                <span className="room-time">{formatTime(r.lastMessageAt)}</span>
              </div>
              <div className="room-preview">{r.lastMessagePreview}</div>
            </div>
          </button>
        ))}
      </aside>

      {id ? <ChatRoom key={id} consultationId={id} rooms={rooms} /> : <EmptyChatMain roomsLoading={roomsLoading} />}
    </section>
  );
}

function ChatRoom({ consultationId, rooms }) {
  const room = rooms.find((r) => r.id === consultationId);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [resourcesByMessage, setResourcesByMessage] = useState({});
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const sourceRef = useRef(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    sendingRef.current = false;
    setSending(false);
    listMessages(consultationId)
      .then(setMessages)
      .finally(() => setLoading(false));
    return () => sourceRef.current?.close();
  }, [consultationId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function refreshMessages() {
    const fresh = await listMessages(consultationId);
    setMessages(fresh);
  }

  async function handleSend(text) {
    const trimmed = text.trim();
    if (!trimmed || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setInput('');
    try {
      const accepted = await sendMessageApi(consultationId, trimmed);
      setMessages((prev) => [...prev, accepted.userMessage, accepted.assistantMessage]);

      sourceRef.current?.close();
      sourceRef.current = openMessageStream(accepted.streamUrl, {
        onDelta: ({ messageId, delta }) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, content: (m.content || '') + delta } : m))
          );
        },
        onCompleted: () => {
          sourceRef.current?.close();
          sendingRef.current = false;
          setSending(false);
          refreshMessages();
        },
        onFailed: ({ messageId }) => {
          sourceRef.current?.close();
          sendingRef.current = false;
          setSending(false);
          setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status: 'FAILED' } : m)));
        },
        onError: () => {
          sourceRef.current?.close();
          sendingRef.current = false;
          setSending(false);
        },
      });
    } catch (err) {
      sendingRef.current = false;
      setSending(false);
      window.alert(err.message || '메시지를 보내지 못했어요.');
    }
  }

  async function toggleResources(messageId) {
    setResourcesByMessage((prev) => {
      const current = prev[messageId];
      if (current) return { ...prev, [messageId]: { ...current, show: !current.show } };
      return prev;
    });
    if (resourcesByMessage[messageId]) return;
    setResourcesByMessage((prev) => ({ ...prev, [messageId]: { show: true, loading: true, items: [] } }));
    try {
      const items = await fetchSupportResources();
      setResourcesByMessage((prev) => ({ ...prev, [messageId]: { show: true, loading: false, items } }));
    } catch {
      setResourcesByMessage((prev) => ({ ...prev, [messageId]: { show: true, loading: false, items: [] } }));
    }
  }

  return (
    <div className="chat-main">
      <div className="chat-header">
        <h2>{room ? `${room.relationship.name}님과의 상담` : '상담'}</h2>
        <p>{room ? `${room.relationship.name}님과의 대화 데이터 기반 상담` : ''}</p>
      </div>

      <div className="chat-scroll" ref={scrollRef}>
        <div className="chat-col">
          {loading && <p style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>대화를 불러오는 중이에요</p>}
          {!loading &&
            messages.map((m) => (
              <MessageBlock
                key={m.id}
                message={m}
                resources={resourcesByMessage[m.id]}
                onToggleResources={() => toggleResources(m.id)}
              />
            ))}
        </div>
      </div>

      <div className="chat-input-area">
        <div className="chip-suggest-row">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button key={q} className="suggest-chip" disabled={sending} onClick={() => handleSend(q)}>{q}</button>
          ))}
        </div>
        <div className="chat-input-row">
          <input
            placeholder="궁금한 점을 편하게 물어보세요"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.isComposing) return;
              e.preventDefault();
              handleSend(input);
            }}
          />
          <button className="send-btn" aria-label="전송" disabled={sending || !input.trim()} onClick={() => handleSend(input)}>
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBlock({ message, resources, onToggleResources }) {
  const isUser = message.role === 'USER';
  return (
    <>
      <div className={`bubble-row ${isUser ? 'user' : 'ai'}`}>
        {!isUser && (
          <div className="bubble-avatar">
            <MiniAstronaut />
          </div>
        )}
        <div className="bubble">
          {message.status === 'GENERATING' && !message.content ? '생각을 정리하고 있어요...' : message.content}
          {message.status === 'FAILED' && ' (답변을 생성하지 못했어요)'}
        </div>
      </div>
      {message.safetyNotice && (
        <div className="risk-card">
          <div className="risk-card-top">
            <WarnIcon />
            <span className="risk-card-title">{message.safetyNotice.title || '변화 감지'}</span>
          </div>
          <div className="risk-card-text">{message.safetyNotice.message}</div>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '8px 14px' }} onClick={onToggleResources}>
            상담 리소스 보기
          </button>
          {resources?.show && (
            <div className="risk-resources">
              {resources.loading && '불러오는 중이에요...'}
              {!resources.loading && resources.items.length === 0 && '표시할 리소스가 없어요.'}
              {!resources.loading &&
                resources.items.map((r) => (
                  <div key={r.id}>
                    · {r.name}{r.phone ? ` · ${r.phone}` : ''}{r.url ? ` · ${r.url}` : ''}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function EmptyChatMain({ roomsLoading }) {
  return (
    <div className="chat-main" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        {roomsLoading ? '상담 기록을 불러오는 중이에요' : '인물별 리포트에서 상담을 시작해 보세요'}
      </p>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return '방금';
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '어제';
  return `${days}일 전`;
}
