import { useState } from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoMark, DashboardIcon, PersonIcon, ChatIcon, ChevronsLeftIcon, GuideIcon } from './Icons';
import userLogo from '../assets/images/UserLogo.png';
import wordmark from '../assets/images/wouldu-wordmark.png';
import './AppLayout.css';

const COLLAPSE_KEY = 'gwangye-sidebar-collapsed';

export default function AppLayout() {
  const { status, isLoggedIn, hasOnboarded, user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(
    () => window.localStorage.getItem(COLLAPSE_KEY) === '1'
  );

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

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="brand">
          <LogoMark size={34} />
          <div className="brand-text">
            <img className="brand-name-img" src={wordmark} alt="WouldU" />
            <div className="brand-tag">끝없는 관계의 우주</div>
          </div>
          <button
            className="sidebar-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? '탭 목록 펼치기' : '탭 목록 접기'}
            title={collapsed ? '탭 목록 펼치기' : '탭 목록 접기'}
          >
            <ChevronsLeftIcon />
          </button>
        </div>

        <nav className="nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="홈">
            <DashboardIcon />
            <span className="nav-label">홈</span>
          </NavLink>
          <NavLink to="/report" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="관계 리포트">
            <PersonIcon />
            <span className="nav-label">관계 리포트</span>
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="AI 상담">
            <ChatIcon />
            <span className="nav-label">AI 상담</span>
          </NavLink>
          <NavLink to="/guide" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="가이드">
            <GuideIcon />
            <span className="nav-label">가이드</span>
          </NavLink>
        </nav>

        <div className="sidebar-spacer" />
        <div className="profile">
          <div className="profile-avatar user-logo-frame">
            <img className="user-logo-image" src={userLogo} alt="사용자 프로필" />
          </div>
          <div className="profile-text" style={{ flex: 1, minWidth: 0 }}>
            <div className="profile-name">{user?.displayName || '우주인'}님</div>
          </div>
          <button className="profile-logout" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
