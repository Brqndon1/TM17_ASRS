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
import { useState, useEffect } from 'react';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  // Check for logged-in user on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
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
    <header style={{
      background: 'linear-gradient(135deg, #4A4A4A 0%, #2C2C2C 100%)',
      color: 'white',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '1rem',
      boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* ---- Left Section: Logo + Title ---- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <img
          src="/asrs-logo.png"
          alt="ASRS Logo"
          style={{
            height: '50px',
            width: 'auto',
            borderRadius: '6px'
          }}
        />
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, lineHeight: 1.2 }}>
            ASRS Initiatives
          </h1>
          <p style={{ fontSize: '0.8rem', margin: 0, opacity: 0.8 }}>
            Reporting System
          </p>
        </div>
      </div>

      {/* ---- Right Section: Navigation ---- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <nav style={{ display: 'flex', gap: '0.5rem' }}>
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

              {/* Admin-only: User Management tab */}
              {isAdmin && (
                <Link 
                  href="/admin/users" 
                  style={getNavLinkStyle('/admin/users')}
                  onMouseEnter={(e) => !isActive('/admin/users') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
                  onMouseLeave={(e) => !isActive('/admin/users') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
                >
                  User Management
                </Link>
              )}
            </>
          ) : null}
          
          {/* Show Survey + Login buttons when not logged in, Logout when logged in */}
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
        </nav>

        {/* Show user info when logged in */}
        {isLoggedIn && (
          <>
            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
              {user.first_name} {user.last_name}
              <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                {user.user_type}
              </div>
            </div>
          </>
        )}
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