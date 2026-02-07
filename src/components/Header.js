/**
 * ============================================================================
 * HEADER COMPONENT — The top navigation bar of the reporting system.
 * ============================================================================
 * Displays:
 * - The ASRS logo (loaded from /public/asrs-logo.png)
 * - The system title
 * - A role selector (Public/Staff/Admin) for testing different user views
 *
 * Props:
 * - userRole: string — The currently selected role ('public', 'staff', 'admin')
 * - onRoleChange: function — Called when the user changes the role dropdown
 *
 * [API ADJUSTMENT] When real authentication is implemented:
 * - REMOVE the role selector dropdown entirely.
 * - Instead, read the user's role from the authentication session/token.
 * - The role would come from the user_type table in the database.
 * ============================================================================
 */
'use client';

export default function Header({ userRole, onRoleChange }) {
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
        {/* ASRS Logo — loads from the public/ folder */}
        {/* Next.js serves anything in /public at the root URL path */}
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

      {/* ---- Right Section: Role Selector ---- */}
      {/*
       * [API ADJUSTMENT] REMOVE this entire div when real login is implemented.
       * The user's role will be determined by authentication, not a dropdown.
       * The login system will read from the user_type table in the database
       * and set the role automatically.
       */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <label style={{ fontSize: '0.85rem', opacity: 0.9 }}>
          Viewing as:
        </label>
        <select
          value={userRole}
          onChange={(e) => onRoleChange(e.target.value)}
          style={{
            padding: '0.4rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.3)',
            backgroundColor: 'rgba(255,255,255,0.15)',
            color: 'white',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <option value="public" style={{ color: '#2C2C2C' }}>Public User</option>
          <option value="staff" style={{ color: '#2C2C2C' }}>Staff User</option>
          <option value="admin" style={{ color: '#2C2C2C' }}>Admin User</option>
        </select>
      </div>
    </header>
  );
}