import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoMark, DashboardIcon, PersonIcon, ChatIcon } from './Icons';
import './AppLayout.css';

export default function AppLayout() {
  const { status, isLoggedIn, hasOnboarded, user, logout } = useAuth();
  const navigate = useNavigate();

  if (status === 'checking') {
    return (
      <div className="auth-check-splash">
        <LogoMark size={36} />
      </div>
    );
  }
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!hasOnboarded) return <Navigate to="/consent" replace />;

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <LogoMark size={34} />
          <div>
            <div className="brand-name">관계온도</div>
            <div className="brand-tag">끝없는 관계의 우주</div>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <DashboardIcon />
            메인 대시보드
          </NavLink>
          <NavLink to="/report" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <PersonIcon />
            인물별 관계
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <ChatIcon />
            AI 챗봇
          </NavLink>
        </nav>

        <div className="sidebar-spacer" />
        <div className="profile">
          <div className="profile-avatar">{(user?.displayName || '우')[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="profile-name">{user?.displayName || '우주인'}님</div>
            <button className="profile-sub" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
