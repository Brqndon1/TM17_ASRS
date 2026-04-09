'use client';

import Header from '@/components/Header';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { apiFetch } from '@/lib/api/client';
import ReasonModal from '@/components/ReasonModal';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Add user form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    user_type: 'staff',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState('users');

  // Roles state
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState('');

  // Create role modal
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState([]);
  const [createRoleLoading, setCreateRoleLoading] = useState(false);

  // Editing role permissions (inline)
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editingPermissions, setEditingPermissions] = useState([]);
  const [savingRole, setSavingRole] = useState(false);

  // Auto-clear success messages
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Check auth
  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.user_type !== 'admin' && !user.permissions?.includes('users.manage')) {
      router.push('/');
    }
  }, [router, user]);

  // Fetch users
  const fetchUsers = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/api/admin/users');
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

  // Fetch roles
  const fetchRoles = async () => {
    setRolesLoading(true);
    setRolesError('');
    try {
      const response = await apiFetch('/api/admin/roles');
      const data = await response.json();
      if (response.ok) {
        setRoles(data.roles);
        setAllPermissions(data.allPermissions);
      } else {
        setRolesError(data.error || 'Failed to load roles');
      }
    } catch (err) {
      setRolesError('Connection error. Please try again.');
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); fetchRoles(); }, [user]);

  useEffect(() => {
    if (activeTab === 'roles') fetchRoles();
  }, [activeTab]);

  // ── Change user role ──────────────────────────────────────────────────────
  const handleRoleChange = async (userId, newRole) => {
    setPendingAction({ type: 'roleChange', userId, newRole });
    setShowReasonModal(true);
  };

  // ── Delete user ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setPendingAction({ type: 'delete', user: deleteTarget });
    setShowReasonModal(true);
  };

  // ── Add new user ──────────────────────────────────────────────────────────
  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);

    if (addForm.phone_number && addForm.phone_number.replace(/\D/g, '').length !== 10) {
      setAddError('Phone number must be 10 digits');
      setAddLoading(false);
      return;
    }

    setPendingAction({ type: 'add', form: { ...addForm } });
    setShowReasonModal(true);
    setAddLoading(false);
  };

  // Called when ReasonModal confirms
  const handleReasonSubmit = async ({ reasonType, reasonText }) => {
    setShowReasonModal(false);
    if (!pendingAction) return;
    setError('');
    try {
      if (pendingAction.type === 'roleChange') {
        const resp = await apiFetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: pendingAction.userId,
            new_role: pendingAction.newRole,
            reasonType,
            reasonText,
          }),
        });
        const data = await resp.json();
        if (resp.ok) {
          setSuccessMsg(`Role updated to ${pendingAction.newRole}`);
          fetchUsers();
        } else {
          setError(data.error || 'Failed to update role');
        }
      } else if (pendingAction.type === 'delete') {
        const userId = pendingAction.user.user_id;
        const url = `/api/admin/users?user_id=${userId}&reasonType=${encodeURIComponent(reasonType)}&reasonText=${encodeURIComponent(reasonText)}`;
        const resp = await apiFetch(url, { method: 'DELETE' });
        const data = await resp.json();
        if (resp.ok) {
          setSuccessMsg(`${pendingAction.user.first_name} ${pendingAction.user.last_name} has been removed`);
          setDeleteTarget(null);
          fetchUsers();
        } else {
          setError(data.error || 'Failed to delete user');
        }
      } else if (pendingAction.type === 'add') {
        setAddLoading(true);
        const resp = await apiFetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...pendingAction.form, reasonType, reasonText }),
        });
        const data = await resp.json();
        if (resp.ok) {
          const defaultMsg = `Invite sent to ${pendingAction.form.email} — they'll set their own password via email.`;
          const withLink = data.verificationUrl ? `${data.message}\n${data.verificationUrl}` : (data.message || defaultMsg);
          setSuccessMsg(withLink);
          setShowAddForm(false);
          setAddForm({ first_name: '', last_name: '', phone_number: '', email: '', user_type: 'staff' });
          fetchUsers();
        } else {
          setAddError(data.error || 'Failed to add user');
        }
        setAddLoading(false);
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      setAddLoading(false);
    } finally {
      setPendingAction(null);
    }
  };

  // ── Role CRUD handlers ────────────────────────────────────────────────────
  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setCreateRoleLoading(true);
    try {
      const resp = await apiFetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoleName, permissions: newRolePermissions }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setSuccessMsg(`Role "${newRoleName}" created`);
        setShowCreateRole(false);
        setNewRoleName('');
        setNewRolePermissions([]);
        fetchRoles();
      } else {
        setRolesError(data.error || 'Failed to create role');
      }
    } catch (err) {
      setRolesError('Connection error');
    } finally {
      setCreateRoleLoading(false);
    }
  };

  const handleSaveRolePermissions = async (userTypeId) => {
    setSavingRole(true);
    try {
      const resp = await apiFetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_type_id: userTypeId, permissions: editingPermissions }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setSuccessMsg('Role permissions updated');
        setEditingRoleId(null);
        fetchRoles();
      } else {
        setRolesError(data.error || 'Failed to update role');
      }
    } catch (err) {
      setRolesError('Connection error');
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (userTypeId, roleName) => {
    if (!confirm(`Delete role "${roleName}"? This cannot be undone.`)) return;
    try {
      const resp = await apiFetch(`/api/admin/roles?user_type_id=${userTypeId}`, { method: 'DELETE' });
      const data = await resp.json();
      if (resp.ok) {
        setSuccessMsg(`Role "${roleName}" deleted`);
        fetchRoles();
      } else {
        setRolesError(data.error || 'Failed to delete role');
      }
    } catch (err) {
      setRolesError('Connection error');
    }
  };

  const togglePermission = (key, permList, setPerm) => {
    if (permList.includes(key)) {
      setPerm(permList.filter(k => k !== key));
    } else {
      setPerm([...permList, key]);
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
    textTransform: 'capitalize',
    letterSpacing: '0.03em',
    backgroundColor: role === 'admin' ? '#e8eaf6' : role === 'staff' ? '#e8f5e9' : '#fff3e0',
    color: role === 'admin' ? '#283593' : role === 'staff' ? '#2e7d32' : '#e65100',
    border: `1px solid ${role === 'admin' ? '#c5cae9' : role === 'staff' ? '#c8e6c9' : '#ffe0b2'}`,
  });

  const formatRoleName = (type) => type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');

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
        {/* Page Title + Action Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
              User Management
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
              Manage users, roles, and permissions.
            </p>
          </div>
          <button
            onClick={() => {
              if (activeTab === 'users') { setShowAddForm(true); setAddError(''); }
              else { setShowCreateRole(true); setRolesError(''); }
            }}
            className="asrs-btn-primary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
          >
            {activeTab === 'users' ? '+ Add User' : '+ Create Role'}
          </button>
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid var(--color-bg-tertiary)' }}>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '0.6rem 1.5rem', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
              border: 'none', backgroundColor: 'transparent',
              borderBottom: activeTab === 'users' ? '2px solid var(--color-asrs-orange)' : '2px solid transparent',
              color: activeTab === 'users' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              marginBottom: '-2px',
            }}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            style={{
              padding: '0.6rem 1.5rem', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
              border: 'none', backgroundColor: 'transparent',
              borderBottom: activeTab === 'roles' ? '2px solid var(--color-asrs-orange)' : '2px solid transparent',
              color: activeTab === 'roles' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              marginBottom: '-2px',
            }}
          >
            Roles & Permissions
          </button>
        </div>

        {/* Success Message */}
        {successMsg && (
          <div style={{
            padding: '0.75rem 1rem', marginBottom: '1rem',
            backgroundColor: '#e8f5e9', border: '1px solid #c8e6c9',
            borderRadius: '8px', color: '#2e7d32', fontSize: '0.9rem', whiteSpace: 'pre-line',
          }}>
            {successMsg}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '0.75rem 1rem', marginBottom: '1rem',
            backgroundColor: '#ffebee', border: '1px solid #ffcdd2',
            borderRadius: '8px', color: '#c62828', fontSize: '0.9rem',
          }}>
            {error}
          </div>
        )}

        {/* ═══════════════════ USERS TAB ═══════════════════ */}
        {activeTab === 'users' && (
          <>
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
                  {roles.map((r) => (
                    <option key={r.user_type_id} value={r.type}>{formatRoleName(r.type)}</option>
                  ))}
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
                  {searchTerm || filterRole !== 'all' ? 'No users match your filters.' : 'No users found.'}
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
                        <th style={thStyle}>Status</th>
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
                              <span style={getRoleBadgeStyle(u.user_type)}>{formatRoleName(u.user_type)}</span>
                            </td>
                            <td style={tdStyle}>
                              {u.verified ? (
                                <span style={{ color: '#2e7d32', fontSize: '0.8rem', fontWeight: '600' }}>Verified</span>
                              ) : (
                                <span style={{ color: '#e65100', fontSize: '0.8rem', fontWeight: '600' }}>Pending</span>
                              )}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                                <select
                                  value={u.user_type}
                                  onChange={(e) => handleRoleChange(u.user_id, e.target.value)}
                                  disabled={isSelf}
                                  style={{
                                    ...selectStyle,
                                    fontSize: '0.8rem',
                                    padding: '0.3rem 0.5rem',
                                    opacity: isSelf ? 0.5 : 1,
                                    cursor: isSelf ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  {roles.map((r) => (
                                    <option key={r.user_type_id} value={r.type}>{formatRoleName(r.type)}</option>
                                  ))}
                                </select>
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
          </>
        )}

        {/* ═══════════════════ ROLES TAB ═══════════════════ */}
        {activeTab === 'roles' && (
          <>
            {rolesError && (
              <div style={{
                padding: '0.75rem 1rem', marginBottom: '1rem',
                backgroundColor: '#ffebee', border: '1px solid #ffcdd2',
                borderRadius: '8px', color: '#c62828', fontSize: '0.9rem',
              }}>
                {rolesError}
              </div>
            )}

            {rolesLoading ? (
              <div className="asrs-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-secondary)' }}>Loading roles...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {roles.map((role) => {
                  const isEditing = editingRoleId === role.user_type_id;
                  return (
                    <div key={role.user_type_id} className="asrs-card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditing ? '1rem' : '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
                            {formatRoleName(role.type)}
                          </h3>
                          {role.is_system && (
                            <span style={{
                              fontSize: '0.7rem', fontWeight: '600', padding: '0.15rem 0.5rem',
                              borderRadius: '10px', backgroundColor: '#e8eaf6', color: '#283593',
                              border: '1px solid #c5cae9', textTransform: 'uppercase', letterSpacing: '0.03em',
                            }}>
                              System
                            </span>
                          )}
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                            {role.user_count} user{role.user_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => setEditingRoleId(null)}
                                style={{
                                  padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600',
                                  border: '1px solid var(--color-bg-tertiary)', backgroundColor: 'white',
                                  color: 'var(--color-text-primary)', cursor: 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveRolePermissions(role.user_type_id)}
                                disabled={savingRole}
                                className="asrs-btn-primary"
                                style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', opacity: savingRole ? 0.6 : 1 }}
                              >
                                {savingRole ? 'Saving...' : 'Save'}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => { setEditingRoleId(role.user_type_id); setEditingPermissions([...role.permissions]); }}
                                style={{
                                  padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600',
                                  border: '1px solid #bbdefb', backgroundColor: '#e3f2fd',
                                  color: '#1565c0', cursor: 'pointer',
                                }}
                              >
                                Edit Permissions
                              </button>
                              {!role.is_system && (
                                <button
                                  onClick={() => handleDeleteRole(role.user_type_id, role.type)}
                                  disabled={role.user_count > 0}
                                  title={role.user_count > 0 ? 'Reassign users before deleting' : 'Delete role'}
                                  style={{
                                    padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600',
                                    border: `1px solid ${role.user_count > 0 ? '#eee' : '#ffcdd2'}`,
                                    backgroundColor: role.user_count > 0 ? '#f5f5f5' : '#ffebee',
                                    color: role.user_count > 0 ? '#bbb' : '#c62828',
                                    cursor: role.user_count > 0 ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Permission grid */}
                      {isEditing ? (
                        <div style={{
                          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                          gap: '0.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px',
                        }}>
                          {allPermissions.map((perm) => {
                            const checked = editingPermissions.includes(perm.key);
                            const disabled = role.type === 'admin' && perm.key === 'users.manage';
                            return (
                              <label
                                key={perm.key}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                                  fontSize: '0.85rem', color: disabled ? '#999' : 'var(--color-text-primary)',
                                  cursor: disabled ? 'not-allowed' : 'pointer',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => togglePermission(perm.key, editingPermissions, setEditingPermissions)}
                                  style={{ accentColor: 'var(--color-asrs-orange)' }}
                                />
                                {perm.label}
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {role.permissions.length === 0 ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>No permissions assigned</span>
                          ) : (
                            role.permissions.map((key) => {
                              const perm = allPermissions.find(p => p.key === key);
                              return (
                                <span key={key} style={{
                                  fontSize: '0.75rem', fontWeight: '600', padding: '0.2rem 0.6rem',
                                  borderRadius: '10px', backgroundColor: '#e8f5e9', color: '#2e7d32',
                                  border: '1px solid #c8e6c9',
                                }}>
                                  {perm ? perm.label : key}
                                </span>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      {deleteTarget && (
        <div style={overlayStyle} onClick={() => setDeleteTarget(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: '0 0 0.5rem 0' }}>
              Confirm Deletion
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div style={{
              padding: '0.75rem 1rem', backgroundColor: '#f8f9fa',
              borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem',
            }}>
              <strong>{deleteTarget.first_name} {deleteTarget.last_name}</strong>
              <br />
              <span style={{ color: 'var(--color-text-secondary)' }}>{deleteTarget.email}</span>
              <span style={{ ...getRoleBadgeStyle(deleteTarget.user_type), marginLeft: '0.75rem' }}>
                {formatRoleName(deleteTarget.user_type)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: '0.5rem 1.25rem', borderRadius: '8px',
                  border: '1px solid var(--color-bg-tertiary)', backgroundColor: 'white',
                  color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setPendingAction({ type: 'delete', user: deleteTarget });
                  setShowReasonModal(true);
                }}
                style={{
                  padding: '0.5rem 1.25rem', borderRadius: '8px',
                  border: '1px solid #ef5350', backgroundColor: '#ef5350',
                  color: 'white', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
                }}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      <ReasonModal visible={showReasonModal} onClose={() => { setShowReasonModal(false); setPendingAction(null); }} onSubmit={handleReasonSubmit} />

      {/* ── Add User Modal ────────────────────────────────────────────────── */}
      {showAddForm && (
        <div style={overlayStyle} onClick={() => setShowAddForm(false)}>
          <div style={{ ...modalStyle, maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: '0 0 0.25rem 0' }}>
              Add New User
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              An invite email will be sent so they can set their own password.
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
                  <input type="text" value={addForm.first_name} onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })} required disabled={addLoading} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Last Name</label>
                  <input type="text" value={addForm.last_name} onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })} required disabled={addLoading} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Phone Number</label>
                <input type="tel" value={addForm.phone_number} onChange={(e) => setAddForm({ ...addForm, phone_number: e.target.value })} disabled={addLoading} required maxLength={10} placeholder="10 digits" style={inputStyle} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required disabled={addLoading} style={inputStyle} />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Role</label>
                <select value={addForm.user_type} onChange={(e) => setAddForm({ ...addForm, user_type: e.target.value })} disabled={addLoading} style={selectStyle}>
                  {roles.length > 0 ? (
                    roles.map((r) => (
                      <option key={r.user_type_id} value={r.type}>{formatRoleName(r.type)}</option>
                    ))
                  ) : (
                    <>
                      <option value="public">Public</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </>
                  )}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddForm(false)} style={{
                  padding: '0.5rem 1.25rem', borderRadius: '8px',
                  border: '1px solid var(--color-bg-tertiary)', backgroundColor: 'white',
                  color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
                }}>
                  Cancel
                </button>
                <button type="submit" className="asrs-btn-primary" disabled={addLoading} style={{
                  padding: '0.5rem 1.25rem', fontSize: '0.9rem',
                  opacity: addLoading ? 0.6 : 1, cursor: addLoading ? 'not-allowed' : 'pointer',
                }}>
                  {addLoading ? 'Sending invite...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Role Modal ──────────────────────────────────────────────── */}
      {showCreateRole && (
        <div style={overlayStyle} onClick={() => setShowCreateRole(false)}>
          <div style={{ ...modalStyle, maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: '0 0 0.25rem 0' }}>
              Create New Role
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Define a role name and select which features it can access.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Role Name</label>
              <input type="text" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="e.g. Budget Manager" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Permissions</label>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '0.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px',
              }}>
                {allPermissions.map((perm) => (
                  <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newRolePermissions.includes(perm.key)}
                      onChange={() => togglePermission(perm.key, newRolePermissions, setNewRolePermissions)}
                      style={{ accentColor: 'var(--color-asrs-orange)' }}
                    />
                    {perm.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreateRole(false)} style={{
                padding: '0.5rem 1.25rem', borderRadius: '8px',
                border: '1px solid var(--color-bg-tertiary)', backgroundColor: 'white',
                color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                disabled={createRoleLoading || !newRoleName.trim()}
                className="asrs-btn-primary"
                style={{
                  padding: '0.5rem 1.25rem', fontSize: '0.9rem',
                  opacity: createRoleLoading || !newRoleName.trim() ? 0.6 : 1,
                  cursor: createRoleLoading || !newRoleName.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {createRoleLoading ? 'Creating...' : 'Create Role'}
              </button>
            </div>
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
