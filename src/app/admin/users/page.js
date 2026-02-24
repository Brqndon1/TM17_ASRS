'use client';

import Header from '@/components/Header';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Add user form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    password: '',
    user_type: 'staff',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Auto-clear success messages
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Check auth on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) { router.push('/login'); return; }
    const parsed = JSON.parse(storedUser);
    if (parsed.user_type !== 'admin') { router.push('/'); return; }
    setUser(parsed);
  }, [router]);

  // Fetch users
  const fetchUsers = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/users?email=${encodeURIComponent(user.email)}`);
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users);
      } else {
        setError(data.error || 'Failed to load users');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [user]);

  // ── Change user role ──────────────────────────────────────────────────────
  const handleRoleChange = async (userId, newRole) => {
    setError('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterEmail: user.email,
          user_id: userId,
          new_role: newRole,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(`Role updated to ${newRole}`);
        fetchUsers();
      } else {
        setError(data.error || 'Failed to update role');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    }
  };

  // ── Delete user ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setError('');
    try {
      const response = await fetch(
        `/api/admin/users?email=${encodeURIComponent(user.email)}&user_id=${deleteTarget.user_id}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(`${deleteTarget.first_name} ${deleteTarget.last_name} has been removed`);
        setDeleteTarget(null);
        fetchUsers();
      } else {
        setError(data.error || 'Failed to delete user');
        setDeleteTarget(null);
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      setDeleteTarget(null);
    }
  };

  // ── Add new user ──────────────────────────────────────────────────────────
  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);

    if (addForm.password.length < 6) {
      setAddError('Password must be at least 6 characters');
      setAddLoading(false);
      return;
    }

    if (!/[a-zA-Z]/.test(addForm.password)) {
      setAddError('Password must contain at least 1 letter');
      setAddLoading(false);
      return;
    }
    if (!/[0-9]/.test(addForm.password)) {
      setAddError('Password must contain at least 1 number');
      setAddLoading(false);
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(addForm.password)) {
      setAddError('Password must contain at least 1 special character');
      setAddLoading(false);
      return;
    }

    // Validate phone number is 10 digits
    if (addForm.phone_number.replace(/\D/g, '').length !== 10) {
      setAddError('Phone number must be 10 digits');
      setAddLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterEmail: user.email,
          ...addForm,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(`${addForm.first_name} ${addForm.last_name} added as ${addForm.user_type}`);
        setShowAddForm(false);
        setAddForm({ first_name: '', last_name: '', phone_number: '', email: '', password: '', user_type: 'staff' });
        fetchUsers();
      } else {
        setAddError(data.error || 'Failed to add user');
      }
    } catch (err) {
      setAddError('Connection error. Please try again.');
    } finally {
      setAddLoading(false);
    }
  };

  // Client-side filtering
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      searchTerm === '' ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.user_type === filterRole;
    return matchesSearch && matchesRole;
  });

  // Role badge styling
  const getRoleBadgeStyle = (role) => ({
    display: 'inline-block',
    padding: '0.2rem 0.65rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    backgroundColor: role === 'admin' ? '#e8eaf6' : '#e8f5e9',
    color: role === 'admin' ? '#283593' : '#2e7d32',
    border: `1px solid ${role === 'admin' ? '#c5cae9' : '#c8e6c9'}`,
  });

  // Don't render until auth check completes
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
        <Header />
        <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>Checking permissions...</p>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Page Title + Add User Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
              User Management
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
              View and manage staff and admin user profiles.
            </p>
          </div>
          <button
            onClick={() => { setShowAddForm(true); setAddError(''); }}
            className="asrs-btn-primary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
          >
            + Add User
          </button>
        </div>

        {/* Success Message */}
        {successMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            backgroundColor: '#e8f5e9',
            border: '1px solid #c8e6c9',
            borderRadius: '8px',
            color: '#2e7d32',
            fontSize: '0.9rem',
          }}>
            ✅ {successMsg}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            backgroundColor: '#ffebee',
            border: '1px solid #ffcdd2',
            borderRadius: '8px',
            color: '#c62828',
            fontSize: '0.9rem',
          }}>
            {error}
          </div>
        )}

        {/* Filters Bar */}
        <div className="asrs-card" style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '1rem 1.25rem', marginBottom: '1rem', flexWrap: 'wrap',
        }}>
          <div style={{ flex: '1 1 250px' }}>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>
              Role:
            </label>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={selectStyle}>
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Loading / Empty / Table */}
        {loading ? (
          <div className="asrs-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="asrs-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {searchTerm || filterRole !== 'all' ? 'No users match your filters.' : 'No staff or admin users found.'}
            </p>
          </div>
        ) : (
          <div className="asrs-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid var(--color-bg-tertiary)' }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Role</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const isSelf = u.email === user.email;
                    return (
                      <tr
                        key={u.user_id}
                        style={{ borderBottom: '1px solid #eee' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafbfc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={tdStyle}>
                          <span style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                            {u.first_name} {u.last_name}
                          </span>
                          {isSelf && (
                            <span style={{
                              marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--color-text-secondary)',
                              fontStyle: 'italic',
                            }}>
                              (you)
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>{u.email}</td>
                        <td style={tdStyle}>{u.phone_number || '—'}</td>
                        <td style={tdStyle}>
                          <span style={getRoleBadgeStyle(u.user_type)}>{u.user_type}</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            {/* Role toggle button */}
                            <button
                              onClick={() => handleRoleChange(u.user_id, u.user_type === 'admin' ? 'staff' : 'admin')}
                              disabled={isSelf}
                              title={isSelf ? 'Cannot change your own role' : `Switch to ${u.user_type === 'admin' ? 'staff' : 'admin'}`}
                              style={{
                                ...actionBtnStyle,
                                backgroundColor: isSelf ? '#f5f5f5' : '#e3f2fd',
                                color: isSelf ? '#bbb' : '#1565c0',
                                border: `1px solid ${isSelf ? '#eee' : '#bbdefb'}`,
                                cursor: isSelf ? 'not-allowed' : 'pointer',
                              }}
                            >
                              → {u.user_type === 'admin' ? 'Staff' : 'Admin'}
                            </button>

                            {/* Delete button */}
                            <button
                              onClick={() => setDeleteTarget(u)}
                              disabled={isSelf}
                              title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
                              style={{
                                ...actionBtnStyle,
                                backgroundColor: isSelf ? '#f5f5f5' : '#ffebee',
                                color: isSelf ? '#bbb' : '#c62828',
                                border: `1px solid ${isSelf ? '#eee' : '#ffcdd2'}`,
                                cursor: isSelf ? 'not-allowed' : 'pointer',
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      {deleteTarget && (
        <div
          style={overlayStyle}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            style={modalStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: '0 0 0.5rem 0' }}>
              Confirm Deletion
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
            }}>
              <strong>{deleteTarget.first_name} {deleteTarget.last_name}</strong>
              <br />
              <span style={{ color: 'var(--color-text-secondary)' }}>{deleteTarget.email}</span>
              <span style={{ ...getRoleBadgeStyle(deleteTarget.user_type), marginLeft: '0.75rem' }}>
                {deleteTarget.user_type}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid var(--color-bg-tertiary)',
                  backgroundColor: 'white',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #ef5350',
                  backgroundColor: '#ef5350',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add User Modal ────────────────────────────────────────────────── */}
      {showAddForm && (
        <div
          style={overlayStyle}
          onClick={() => setShowAddForm(false)}
        >
          <div
            style={{ ...modalStyle, maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: '0 0 0.25rem 0' }}>
              Add New User
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Create a new staff or admin account.
            </p>

            {addError && (
              <div style={{
                padding: '0.6rem 0.75rem', marginBottom: '1rem',
                backgroundColor: '#ffebee', border: '1px solid #ffcdd2',
                borderRadius: '8px', color: '#c62828', fontSize: '0.85rem',
              }}>
                {addError}
              </div>
            )}

            <form onSubmit={handleAddUser}>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>First Name</label>
                  <input
                    type="text"
                    value={addForm.first_name}
                    onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                    required
                    disabled={addLoading}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Last Name</label>
                  <input
                    type="text"
                    value={addForm.last_name}
                    onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                    required
                    disabled={addLoading}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Phone Number</label>
                <input
                  type="tel"
                  value={addForm.phone_number}
                  onChange={(e) => setAddForm({ ...addForm, phone_number: e.target.value })}
                  required
                  disabled={addLoading}
                  maxLength={10}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  required
                  disabled={addLoading}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  required
                  disabled={addLoading}
                  placeholder="Min. 6 characters, 1 number, 1 special char"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Role</label>
                <select
                  value={addForm.user_type}
                  onChange={(e) => setAddForm({ ...addForm, user_type: e.target.value })}
                  disabled={addLoading}
                  style={selectStyle}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{
                    padding: '0.5rem 1.25rem', borderRadius: '8px',
                    border: '1px solid var(--color-bg-tertiary)',
                    backgroundColor: 'white', color: 'var(--color-text-primary)',
                    fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="asrs-btn-primary"
                  disabled={addLoading}
                  style={{
                    padding: '0.5rem 1.25rem', fontSize: '0.9rem',
                    opacity: addLoading ? 0.6 : 1,
                    cursor: addLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {addLoading ? 'Creating...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Shared Styles ───────────────────────────────────────────────────────── */

const thStyle = {
  textAlign: 'left', padding: '0.75rem 1rem', fontWeight: '700',
  fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#555',
};

const tdStyle = {
  padding: '0.75rem 1rem', color: 'var(--color-text-secondary)',
};

const actionBtnStyle = {
  padding: '0.3rem 0.75rem', borderRadius: '6px',
  fontSize: '0.8rem', fontWeight: '600', transition: 'opacity 0.15s',
};

const inputStyle = {
  width: '100%', padding: '0.5rem 0.75rem',
  border: '1px solid var(--color-bg-tertiary)', borderRadius: '8px',
  fontSize: '0.9rem', color: 'var(--color-text-primary)',
  backgroundColor: 'white', outline: 'none', boxSizing: 'border-box',
};

const selectStyle = {
  padding: '0.5rem 0.75rem', border: '1px solid var(--color-bg-tertiary)',
  borderRadius: '8px', fontSize: '0.9rem', color: 'var(--color-text-primary)',
  backgroundColor: 'white', outline: 'none', cursor: 'pointer',
};

const labelStyle = {
  display: 'block', color: 'var(--color-text-primary)',
  marginBottom: '0.3rem', fontWeight: '600', fontSize: '0.85rem',
};

const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 200,
};

const modalStyle = {
  backgroundColor: 'white', borderRadius: '12px', padding: '1.75rem',
  maxWidth: '440px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};