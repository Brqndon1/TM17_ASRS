/**
 * ============================================================================
 * HEADER COMPONENT — The top navigation bar of the reporting system.
 * ============================================================================
 * Displays:
 * - The ASRS logo (loaded from /public/asrs-logo.png)
 * - The system title
 * - Navigation tabs (shown only when logged in) with active highlighting
 * - Distribute, Goals, Performance (staff and admin)
 * - "History" dropdown with Reports + Audit Log (staff/admin; Audit Log admin-only)
 * - "User Management" tab (admin only)
 * - Login/Logout button
 * - User info when logged in
 * ============================================================================
 */
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { apiFetch } from '@/lib/api/client';

function ProfileAvatar({ user, picture }) {
  const initials =
    `${(user?.first_name || '')[0] || ''}${(user?.last_name || '')[0] || ''}`.toUpperCase();

  const base = {
    width: 36, height: 36, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.5)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    cursor: 'pointer', flexShrink: 0,
  };

  if (picture) {
    return (
      <img
        src={picture}
        alt="Profile"
        title={`${user?.first_name} ${user?.last_name}`}
        style={{ ...base, objectFit: 'cover' }}
      />
    );
  }

  return (
    <div
      title={`${user?.first_name} ${user?.last_name}`}
      style={{
        ...base,
        background: 'linear-gradient(135deg, #C0392B 0%, #E67E22 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontWeight: '700', fontSize: '0.8rem', userSelect: 'none',
      }}
    >
      {initials}
    </div>
  );
}

function HistoryDropdown({ isActive, getNavLinkStyle, navHoverHandlers, isAdmin }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const pathname = usePathname();

  const isHistoryActive = pathname.startsWith('/history');

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          ...getNavLinkStyle(isHistoryActive ? '/history' : '__none__'),
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          backgroundColor: isHistoryActive
            ? 'rgba(255,255,255,0.35)'
            : 'rgba(255,255,255,0.15)',
          fontWeight: isHistoryActive ? '700' : '600',
          boxShadow: isHistoryActive ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!isHistoryActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
        }}
        onMouseLeave={(e) => {
          if (!isHistoryActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
        }}
      >
        History
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            minWidth: '160px',
            backgroundColor: '#3a3a3a',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.12)',
            overflow: 'hidden',
            zIndex: 200,
          }}
        >
          <Link
            href="/history/reports"
            onClick={() => setOpen(false)}
            style={{
              display: 'block',
              padding: '0.6rem 1rem',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: pathname === '/history/reports' ? '700' : '500',
              textDecoration: 'none',
              backgroundColor: pathname === '/history/reports'
                ? 'rgba(255,255,255,0.15)'
                : 'transparent',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (pathname !== '/history/reports') e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={(e) => {
              if (pathname !== '/history/reports') e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Reports
          </Link>

          {isAdmin && (
            <Link
              href="/history/audit-log"
              onClick={() => setOpen(false)}
              style={{
                display: 'block',
                padding: '0.6rem 1rem',
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: pathname === '/history/audit-log' ? '700' : '500',
                textDecoration: 'none',
                backgroundColor: pathname === '/history/audit-log'
                  ? 'rgba(255,255,255,0.15)'
                  : 'transparent',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (pathname !== '/history/audit-log') e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={(e) => {
                if (pathname !== '/history/audit-log') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Audit Log
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearUser } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHydrated = typeof window !== 'undefined';
  const headerRef = useRef(null);
  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;

    apiFetch('/api/user/profile')
      .then((data) => setProfilePic(data?.user?.profile_picture ?? null))
      .catch(() => setProfilePic(null));
  }, [user]);

  const isLoggedIn = Boolean(user);
  const isAdmin = isLoggedIn && user.user_type === 'admin';
  const isStaffOrAdmin =
    isLoggedIn && (user.user_type === 'staff' || user.user_type === 'admin');

  async function handleLogout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
    clearUser();
    router.push('/login');
  }

  function isActive(href) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  function getNavLinkStyle(href) {
    return {
      padding: '0.4rem 1rem',
      borderRadius: '6px',
      border: '1px solid rgba(255,255,255,0.3)',
      backgroundColor: isActive(href) ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)',
      color: 'white',
      fontSize: '0.85rem',
      fontWeight: isActive(href) ? '700' : '600',
      textDecoration: 'none',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      boxShadow: isActive(href) ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
    };
  }

  const navHoverHandlers = (href) => ({
    onMouseEnter: (event) => {
      if (!isActive(href)) {
        event.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
      }
    },
    onMouseLeave: (event) => {
      if (!isActive(href)) {
        event.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
      }
    },
  });

  return (
    <header
      ref={headerRef}
      style={{
        background: 'linear-gradient(135deg, #4A4A4A 0%, #2C2C2C 100%)',
        color: 'white',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
        <img
          src="/asrs-logo.png"
          alt="ASRS Logo"
          style={{ height: '50px', width: 'auto', borderRadius: '6px', flexShrink: 0 }}
        />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
            ASRS Initiatives
          </h1>
          <p style={{ fontSize: '0.8rem', margin: 0, opacity: 0.8, whiteSpace: 'nowrap' }}>
            Reporting System
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          className="header-hamburger"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span className="header-hamburger-line" />
          <span className="header-hamburger-line" />
          <span className="header-hamburger-line" />
        </button>

        <div className={`header-nav-area${menuOpen ? ' open' : ''}`}>
          <nav className="header-nav-links">
          {isHydrated && (
          <>
          {/* Show all navigation tabs only when logged in */}
          {isLoggedIn ? (
            <>
              <Link 
                href="/" 
                style={getNavLinkStyle('/')}
                onMouseEnter={(e) => !isActive('/') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
                onMouseLeave={(e) => !isActive('/') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              >
                Home
              </Link>
              <Link 
                href="/survey" 
                style={getNavLinkStyle('/survey')}
                onMouseEnter={(e) => !isActive('/survey') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
                onMouseLeave={(e) => !isActive('/survey') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              >
                Survey
              </Link>
              {isStaffOrAdmin && (
                <Link 
                  href="/survey-distribution" 
                  style={getNavLinkStyle('/survey-distribution')}
                  onMouseEnter={(e) => !isActive('/survey-distribution') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
                  onMouseLeave={(e) => !isActive('/survey-distribution') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
                >
                  Distribute
                </Link>
              )}
              <Link 
                href="/reporting" 
                style={getNavLinkStyle('/reporting')}
                onMouseEnter={(e) => !isActive('/reporting') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
                onMouseLeave={(e) => !isActive('/reporting') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              >
                Reporting
              </Link>
              <Link 
                href="/initiative-creation" 
                style={getNavLinkStyle('/initiative-creation')}
                onMouseEnter={(e) => !isActive('/initiative-creation') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
                onMouseLeave={(e) => !isActive('/initiative-creation') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              >
                Initiatives
              </Link>

                {isStaffOrAdmin && (
                  <>
                    <Link href="/goals" style={getNavLinkStyle('/goals')} {...navHoverHandlers('/goals')}>
                      Goals
                    </Link>
                    <Link href="/performance-dashboard" style={getNavLinkStyle('/performance-dashboard')} {...navHoverHandlers('/performance-dashboard')}>
                      Performance
                    </Link>
                    <HistoryDropdown
                      isActive={isActive}
                      getNavLinkStyle={getNavLinkStyle}
                      navHoverHandlers={navHoverHandlers}
                      isAdmin={isAdmin}
                    />
                  </>
                )}
                {isAdmin && (
                  <Link href="/admin/users" style={getNavLinkStyle('/admin/users')} {...navHoverHandlers('/admin/users')}>
                    User Management
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/" style={getNavLinkStyle('/')} {...navHoverHandlers('/')}>
                  Home
                </Link>
                <Link href="/survey" style={getNavLinkStyle('/survey')} {...navHoverHandlers('/survey')}>
                  Take Survey
                </Link>
                <Link href="/login" style={getNavLinkStyle('/login')} {...navHoverHandlers('/login')}>
                  Login
                </Link>
              </>
            )}
            </>
            )}
            </nav>
  
            {isLoggedIn && isHydrated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.3)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                <Link href="/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <ProfileAvatar user={user} picture={profilePic} />
                  <div style={{ fontSize: '0.82rem', color: 'white', opacity: 0.9, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                    {user.first_name} {user.last_name}
                    <div style={{ fontSize: '0.68rem', opacity: 0.65, textTransform: 'capitalize' }}>
                      {user.user_type}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  style={{ ...logoutButtonStyle, fontSize: '0.75rem', padding: '0.25rem 0.75rem', width: '100%' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.35)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'; }}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const logoutButtonStyle = {
  padding: '0.4rem 1rem',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.3)',
  backgroundColor: 'rgba(255,255,255,0.25)',
  color: 'white',
  fontSize: '0.85rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
};
