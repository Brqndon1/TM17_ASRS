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
import { useState, useEffect, useRef } from 'react';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);

  // Check for logged-in user on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Close the mobile menu when the user clicks outside the header
  useEffect(() => {
    function handleClickOutside(e) {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const isLoggedIn = !!user;
  const isAdmin = isLoggedIn && user.user_type === 'admin';

  // Helper function to check if a route is active
  const isActive = (href) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // Navigation link style with active state
  const getNavLinkStyle = (href) => ({
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
  });

  return (
    <header ref={headerRef} style={{
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
      zIndex: 100
    }}>
      {/* ---- Left Section: Logo + Title ---- */}
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

      {/* ---- Right Section: Hamburger + Collapsible Nav ---- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

        {/* Hamburger button — visible only on mobile (≤768px) via CSS */}
        <button
          className="header-hamburger"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span className="header-hamburger-line" />
          <span className="header-hamburger-line" />
          <span className="header-hamburger-line" />
        </button>

        {/* Nav area — full row on desktop, absolute dropdown on mobile */}
        <div className={`header-nav-area${menuOpen ? ' open' : ''}`}>
          <nav className="header-nav-links">
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
                href="/form-creation" 
                style={getNavLinkStyle('/form-creation')}
                onMouseEnter={(e) => !isActive('/form-creation') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
                onMouseLeave={(e) => !isActive('/form-creation') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              >
                Form Creation
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
                href="/report-creation" 
                style={getNavLinkStyle('/report-creation')}
                onMouseEnter={(e) => !isActive('/report-creation') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
                onMouseLeave={(e) => !isActive('/report-creation') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              >
                Report Creation
              </Link>
              <Link 
                href="/reporting" 
                style={getNavLinkStyle('/reporting')}
                onMouseEnter={(e) => !isActive('/reporting') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
                onMouseLeave={(e) => !isActive('/reporting') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              >
                Reporting
              </Link>

              {/* Admin-only tabs */}
              {isAdmin && (
                <>
                  <Link 
                    href="/goals" 
                    style={getNavLinkStyle('/goals')}
                    onMouseEnter={(e) => !isActive('/goals') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
                    onMouseLeave={(e) => !isActive('/goals') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
                  >
                    Goals
                  </Link>
                  <Link 
                    href="/initiative-creation" 
                    style={getNavLinkStyle('/initiative-creation')}
                    onMouseEnter={(e) => !isActive('/initiative-creation') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
                    onMouseLeave={(e) => !isActive('/initiative-creation') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
                  >
                    Initiatives
                  </Link>
                  <Link 
                    href="/admin/users" 
                    style={getNavLinkStyle('/admin/users')}
                    onMouseEnter={(e) => !isActive('/admin/users') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
                    onMouseLeave={(e) => !isActive('/admin/users') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
                  >
                    User Management
                  </Link>
                </>
              )}
            </>
          ) : null}

          {/* Show Survey + Login when not logged in; Logout when logged in */}
          {!isLoggedIn ? (
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
                Take Survey
              </Link>
              <Link
                href="/login"
                style={getNavLinkStyle('/login')}
                onMouseEnter={(e) => !isActive('/login') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
                onMouseLeave={(e) => !isActive('/login') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              >
                Login
              </Link>
            </>
          ) : (
            <button
              onClick={handleLogout}
              style={logoutButtonStyle}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.35)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'}
            >
              Logout
            </button>
          )}
          </nav>{/* end header-nav-links */}

          {/* User info — shown inside dropdown on mobile, inline on desktop */}
          {isLoggedIn && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.3)' }} />
              <div style={{ fontSize: '0.85rem', opacity: 0.9, whiteSpace: 'nowrap' }}>
                {user.first_name} {user.last_name}
                <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{user.user_type}</div>
              </div>
            </div>
          )}
        </div>{/* end header-nav-area */}
      </div>{/* end right section */}
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