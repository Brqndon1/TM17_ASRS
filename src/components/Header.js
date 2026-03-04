/**
 * ============================================================================
 * HEADER COMPONENT — The top navigation bar of the reporting system.
 * ============================================================================
 * Displays:
 * - The ASRS logo (loaded from /public/asrs-logo.png)
 * - The system title
 * - Navigation tabs (shown only when logged in) with active highlighting
 * - "User Management" tab (shown only for admin users)
 * - Login/Logout button
 * - User info when logged in
 * ============================================================================
 */
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearUser } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isLoggedIn = Boolean(user);
  const isAdmin = isLoggedIn && user.user_type === 'admin';

  function handleLogout() {
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
              {isAdmin && (
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

                {isAdmin && (
                  <>
                    <Link href="/goals" style={getNavLinkStyle('/goals')} {...navHoverHandlers('/goals')}>
                      Goals
                    </Link>
                    <Link href="/performance-dashboard" style={getNavLinkStyle('/performance-dashboard')} {...navHoverHandlers('/performance-dashboard')}>
                      Performance
                    </Link>
                    <Link href="/admin/users" style={getNavLinkStyle('/admin/users')} {...navHoverHandlers('/admin/users')}>
                      User Management
                    </Link>
                  </>
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

            {isLoggedIn && (
              <button
                onClick={handleLogout}
                style={logoutButtonStyle}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.35)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)';
                }}
              >
                Logout
              </button>
            )}
          </>
          )}
          </nav>

          {isLoggedIn && isHydrated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.3)' }} />
              <div style={{ fontSize: '0.85rem', opacity: 0.9, whiteSpace: 'nowrap' }}>
                {user.first_name} {user.last_name}
                <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{user.user_type}</div>
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
