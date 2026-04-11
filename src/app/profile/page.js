'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { apiFetch } from '@/lib/api/client';

// ─── Avatar helpers ───────────────────────────────────────────────────────────
function getInitials(first, last) {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
}

function Avatar({ picture, firstName, lastName, size = 80 }) {
  const base = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    border: '3px solid rgba(255,255,255,0.3)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
  };
  if (picture) {
    return <img src={picture} alt="Profile" style={{ ...base, objectFit: 'cover' }} />;
  }
  return (
    <div
      style={{
        ...base,
        background: 'linear-gradient(135deg, #E67E22, #C0392B)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: '700',
        fontSize: size * 0.35,
      }}
    >
      {getInitials(firstName, lastName)}
    </div>
  );
}

function roleBadgeStyle(role) {
  const colors = { admin: '#8E44AD', staff: '#2980B9', public: '#27AE60' };
  return {
    display: 'inline-block',
    background: colors[role] || '#888',
    color: 'white',
    fontSize: '0.68rem',
    fontWeight: '700',
    padding: '0.2rem 0.6rem',
    borderRadius: '999px',
    marginTop: '0.35rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  };
}

// ── Activity icon colors ──
function getActivityIcon(type) {
  const icons = {
    edit:    { bg: '#FEF3C7', color: '#E67E22', symbol: '✏️' },
    publish: { bg: '#DBEAFE', color: '#1E40AF', symbol: '📢' },
    create:  { bg: '#D1FAE5', color: '#065F46', symbol: '✚' },
    delete:  { bg: '#FEE2E2', color: '#991B1B', symbol: '✕' },
    login:   { bg: '#F3F4F6', color: '#6B7280', symbol: '→' },
  };
  return icons[type] || icons.login;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { user, hydrated, setUser, clearUser } = useAuthStore();

  const [profile, setProfile]   = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [pageError, setPageError] = useState('');

  // Edit state
  const [firstName,       setFirstName]       = useState('');
  const [lastName,        setLastName]        = useState('');
  const [email,           setEmail]           = useState('');
  const [phone,           setPhone]           = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pictureDataUrl,  setPictureDataUrl]  = useState(null);
  const [editError,  setEditError]  = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError,   setDeleteError]   = useState('');
  const [deleting, setDeleting] = useState(false);

  // Password change visibility
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (hydrated && user === null) router.push('/login');
  }, [user, hydrated, router]);

  useEffect(() => {
    if (!user) return;
    apiFetch('/api/user/profile')
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.user);
        setSubmissions(data.submissions || []);
        setFirstName(data.user.first_name);
        setLastName(data.user.last_name);
        setEmail(data.user.email);
        setPhone(data.user.phone_number || '');
      })
      .catch(() => setPageError('Could not load your profile. Please try again.'))
      .finally(() => setLoading(false));
  }, [user]);

  function handlePictureChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) { setEditError('Image must be under 1 MB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setPictureDataUrl(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setEditError('');
    setEditSuccess('');
    if (newPassword && newPassword !== confirmPassword) {
      setEditError('New passwords do not match.');
      return;
    }
    const body = {
      first_name: firstName,
      last_name:  lastName,
      email,
      phone_number: phone || null,
    };
    if (currentPassword) body.current_password = currentPassword;
    if (newPassword)     body.new_password     = newPassword;
    if (pictureDataUrl !== null) body.profile_picture = pictureDataUrl;

    setSaving(true);
    try {
      const res  = await apiFetch('/api/user/profile', { method: 'PUT', body: JSON.stringify(body) });
      const data = await res.json();
      setProfile(data.user);
      setUser({ ...user, first_name: data.user.first_name, last_name: data.user.last_name });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPictureDataUrl(null);
      setEditSuccess('Profile updated successfully!');
    } catch (err) {
      setEditError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deleteConfirm !== 'DELETE') { setDeleteError('Please type DELETE to confirm.'); return; }
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await apiFetch('/api/user/profile', { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      clearUser();
      router.push('/login');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account.');
      setDeleting(false);
    }
  }

  const displayPicture = pictureDataUrl !== null ? pictureDataUrl : (profile?.profile_picture ?? null);

  // Build recent activity from submissions (placeholder; extend as needed)
  const recentActivity = submissions.slice(0, 5).map((s) => ({
    type: 'create',
    description: `Submitted survey for ${s.initiative_name || 'an initiative'}`,
    time: s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
  }));

  if (!user || loading) {
    return (
      <PageLayout title="My Profile">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', color: '#9CA3AF' }}>
          Loading profile...
        </div>
      </PageLayout>
    );
  }

  if (pageError) {
    return (
      <PageLayout title="My Profile">
        <div style={{ color: '#C0392B', padding: '2rem' }}>{pageError}</div>
      </PageLayout>
    );
  }

  const inputStyle = {
    width: '100%',
    padding: '0.6rem 0.85rem',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#1F2937',
    backgroundColor: '#fff',
    transition: 'border-color 0.15s ease',
  };

  const inputReadonlyStyle = {
    ...inputStyle,
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
  };

  return (
    <PageLayout title="My Profile">
      <div>
        {/* Page heading */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1F2937', margin: 0 }}>My Profile</h1>
        </div>

        {/* Profile grid — 2 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'start' }}>

          {/* Left: Profile card */}
          <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            {/* Avatar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <Avatar picture={displayPicture} firstName={profile?.first_name} lastName={profile?.last_name} size={80} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: '26px', height: '26px', borderRadius: '50%',
                    backgroundColor: '#E67E22', border: '2px solid #fff',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', color: '#fff', fontWeight: 700,
                  }}
                  title="Change photo"
                >
                  ✏
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePictureChange} />
              </div>
            </div>

            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1F2937', margin: '0 0 0.25rem' }}>
              {profile?.first_name} {profile?.last_name}
            </h2>
            <div style={roleBadgeStyle(profile?.user_type)}>{profile?.user_type}</div>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0.75rem 0 1.25rem' }}>
              {profile?.email}
            </p>

            <button
              onClick={() => setShowPasswordSection((v) => !v)}
              className="btn-outline"
              style={{
                width: '100%', padding: '0.55rem 1rem',
                border: '1px solid #E5E7EB', borderRadius: '8px',
                backgroundColor: '#fff', color: '#374151',
                fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
              }}
            >
              Edit Profile
            </button>

            {/* Delete account */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #F3F4F6' }}>
              <details>
                <summary style={{ fontSize: '0.78rem', color: '#EF4444', cursor: 'pointer', fontWeight: 600, listStyle: 'none' }}>
                  Delete Account
                </summary>
                <div style={{ marginTop: '0.75rem', textAlign: 'left' }}>
                  <p style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                    This is permanent and cannot be undone.
                  </p>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    style={{ ...inputStyle, fontSize: '0.83rem', marginBottom: '0.5rem' }}
                  />
                  {deleteError && <p style={{ color: '#C0392B', fontSize: '0.78rem', margin: '0.25rem 0' }}>{deleteError}</p>}
                  <button
                    onClick={handleDelete}
                    disabled={deleting || deleteConfirm !== 'DELETE'}
                    style={{
                      width: '100%', padding: '0.5rem',
                      backgroundColor: deleteConfirm === 'DELETE' ? '#EF4444' : '#D1D5DB',
                      color: '#fff', border: 'none', borderRadius: '8px',
                      fontWeight: 700, fontSize: '0.83rem',
                      cursor: deleteConfirm === 'DELETE' ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {deleting ? 'Deleting...' : 'Delete My Account'}
                  </button>
                </div>
              </details>
            </div>
          </div>

          {/* Right: Account Settings form */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1F2937', margin: 0 }}>Account Settings</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = '#E67E22'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, visibility: 'hidden' }}>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = '#E67E22'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#E67E22'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Role</label>
              <input
                type="text"
                value={profile?.user_type || ''}
                readOnly
                style={inputReadonlyStyle}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#E67E22'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
              />
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid #E5E7EB', margin: '1.25rem 0' }} />

            {/* Change Password section */}
            <div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#374151', margin: '0 0 0.75rem' }}>Change Password</h4>
              <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>
                Leave blank to keep your current password.
              </p>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={labelStyle}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = '#E67E22'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
                />
              </div>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={labelStyle}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = '#E67E22'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
                />
              </div>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={labelStyle}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = '#E67E22'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
                />
              </div>
            </div>

            {editError   && <p style={{ color: '#C0392B', fontSize: '0.85rem', margin: '0.5rem 0' }}>{editError}</p>}
            {editSuccess && <p style={{ color: '#27AE60', fontSize: '0.85rem', margin: '0.5rem 0' }}>{editSuccess}</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
              style={{
                padding: '0.65rem 1.75rem', borderRadius: '8px', border: 'none',
                background: 'linear-gradient(135deg, #E67E22 0%, #C0392B 100%)',
                color: 'white', fontWeight: '700', fontSize: '0.95rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                marginTop: '0.5rem',
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Recent Activity card */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1F2937', margin: 0 }}>Recent Activity</h3>
          </div>

          {recentActivity.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>No recent activity to show.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentActivity.map((item, idx) => {
                const icon = getActivityIcon(item.type);
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    {/* Icon */}
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '8px',
                      backgroundColor: icon.bg, color: icon.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {icon.symbol}
                    </div>
                    {/* Text */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', color: '#374151' }}>{item.description}</div>
                    </div>
                    {/* Time */}
                    <div style={{ fontSize: '0.78rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>{item.time}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Survey submissions table */}
          {submissions.length > 0 && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #E5E7EB' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.75rem' }}>
                Survey Submissions
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F3F4F6' }}>
                    <th style={th}>ID</th>
                    <th style={th}>Initiative</th>
                    <th style={th}>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.submission_id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                      <td style={td}>#{s.submission_id}</td>
                      <td style={td}>{s.initiative_name || '—'}</td>
                      <td style={td}>{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '0.35rem',
  letterSpacing: '0.01em',
};

const th = {
  textAlign: 'left',
  padding: '0.5rem 0.75rem',
  fontWeight: '700',
  color: '#9CA3AF',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const td = { padding: '0.55rem 0.75rem', color: '#374151' };
