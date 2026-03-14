/**
 * ============================================================================
 * /profile — Self-service profile page
 * ============================================================================
 * Three tabs:
 *   1. Profile      — view name, email, phone, role, submissions
 *   2. Edit Profile — update any field + optional new password + photo
 *   3. Delete Account — confirmation flow
 *
 * Place this file at:
 *   src/app/profile/page.js
 * ============================================================================
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { apiFetch } from '@/lib/api/client';

// ─── Avatar helpers ───────────────────────────────────────────────────────────
function getInitials(first, last) {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
}

function Avatar({ picture, firstName, lastName, size = 72 }) {
  const base = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    border: '3px solid rgba(255,255,255,0.2)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  };
  if (picture) {
    return <img src={picture} alt="Profile" style={{ ...base, objectFit: 'cover' }} />;
  }
  return (
    <div
      style={{
        ...base,
        background: 'linear-gradient(135deg, #C0392B 0%, #E67E22 100%)',
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

function TabButton({ label, active, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.6rem 1.4rem',
        border: 'none',
        borderBottom: active
          ? `3px solid ${danger ? '#C0392B' : '#C0392B'}`
          : '3px solid transparent',
        background: 'none',
        color: active ? (danger ? '#C0392B' : '#2C2C2C') : '#888',
        fontWeight: active ? '700' : '500',
        fontSize: '0.95rem',
        cursor: 'pointer',
        transition: 'color 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function FieldRow({ label, value }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1rem', color: '#2C2C2C' }}>{value || '—'}</div>
    </div>
  );
}

function FormField({ label, type = 'text', value, onChange, placeholder, error, hint }) {
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '0.6rem 0.85rem',
          border: `1px solid ${error ? '#C0392B' : '#ddd'}`,
          borderRadius: '6px',
          fontSize: '0.95rem',
          outline: 'none',
          boxSizing: 'border-box',
          color: '#2C2C2C',
        }}
      />
      {hint  && !error && <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: '#aaa' }}>{hint}</p>}
      {error &&           <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: '#C0392B' }}>{error}</p>}
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
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, clearUser } = useAuthStore();

  const [tab, setTab]           = useState('view');
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
  const [pictureDataUrl,  setPictureDataUrl]  = useState(null); // null = no change
  const [editError,  setEditError]  = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError,   setDeleteError]   = useState('');
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user === null) router.push('/login');
  }, [user, router]);

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

  if (!user || loading) {
    return (
      <>
        <Header />
        <main style={pageWrap}><p style={{ color: '#aaa' }}>Loading profile…</p></main>
      </>
    );
  }

  if (pageError) {
    return (
      <>
        <Header />
        <main style={pageWrap}><p style={{ color: '#C0392B' }}>{pageError}</p></main>
      </>
    );
  }

  const displayPicture = pictureDataUrl !== null ? pictureDataUrl : (profile?.profile_picture ?? null);

  return (
    <>
      <Header />
      <main style={pageWrap}>
        {/* Hero row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
          <Avatar picture={displayPicture} firstName={profile?.first_name} lastName={profile?.last_name} size={72} />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: '#2C2C2C' }}>
              {profile?.first_name} {profile?.last_name}
            </h1>
            <span style={roleBadgeStyle(profile?.user_type)}>{profile?.user_type?.toUpperCase()}</span>
          </div>
        </div>

        {/* Card */}
        <div style={card}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '1.75rem', overflowX: 'auto' }}>
            <TabButton label="Profile"        active={tab === 'view'}   onClick={() => setTab('view')} />
            <TabButton label="Edit Profile"   active={tab === 'edit'}   onClick={() => setTab('edit')} />
            <TabButton label="Delete Account" active={tab === 'delete'} onClick={() => setTab('delete')} danger />
          </div>

          {/* VIEW */}
          {tab === 'view' && (
            <div>
              <FieldRow label="First Name"   value={profile?.first_name} />
              <FieldRow label="Last Name"    value={profile?.last_name} />
              <FieldRow label="Email"        value={profile?.email} />
              <FieldRow label="Phone Number" value={profile?.phone_number} />
              <FieldRow label="Account Type" value={profile?.user_type} />

              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Survey Submissions
                </h3>
                {submissions.length === 0 ? (
                  <p style={{ color: '#aaa', fontSize: '0.9rem' }}>No surveys submitted yet.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                        <th style={th}>ID</th>
                        <th style={th}>Initiative</th>
                        <th style={th}>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((s) => (
                        <tr key={s.submission_id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                          <td style={td}>#{s.submission_id}</td>
                          <td style={td}>{s.initiative_name || '—'}</td>
                          <td style={td}>{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* EDIT */}
          {tab === 'edit' && (
            <div style={{ maxWidth: 480 }}>
              {/* Photo picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <Avatar picture={displayPicture} firstName={firstName} lastName={lastName} size={58} />
                <div>
                  <button onClick={() => fileInputRef.current?.click()} style={btnSecondary}>
                    {displayPicture ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {displayPicture && (
                    <button onClick={() => setPictureDataUrl('')} style={{ ...btnSecondary, marginLeft: '0.5rem', color: '#C0392B', borderColor: '#C0392B' }}>
                      Remove
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePictureChange} />
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.72rem', color: '#aaa' }}>Optional · JPG, PNG · Max 1 MB</p>
                </div>
              </div>

              <FormField label="First Name"   value={firstName} onChange={setFirstName} />
              <FormField label="Last Name"    value={lastName}  onChange={setLastName} />
              <FormField label="Email"        value={email}     onChange={setEmail} type="email" />
              <FormField label="Phone Number" value={phone}     onChange={setPhone} placeholder="10-digit number" hint="Optional" />

              <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '1.5rem 0' }} />
              <p style={{ fontSize: '0.78rem', color: '#aaa', marginBottom: '0.75rem' }}>
                Leave password fields blank to keep your current password.
              </p>

              <FormField label="Current Password" type="password" value={currentPassword} onChange={setCurrentPassword} hint="Required only when changing password" />
              <FormField label="New Password"     type="password" value={newPassword}     onChange={setNewPassword}     hint="Minimum 8 characters" />
              <FormField label="Confirm Password" type="password" value={confirmPassword} onChange={setConfirmPassword} />

              {editError   && <p style={{ color: '#C0392B', fontSize: '0.85rem', margin: '0.5rem 0' }}>{editError}</p>}
              {editSuccess && <p style={{ color: '#27AE60', fontSize: '0.85rem', margin: '0.5rem 0' }}>{editSuccess}</p>}

              <button onClick={handleSave} disabled={saving} style={btnPrimary}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* DELETE */}
          {tab === 'delete' && (
            <div style={{ maxWidth: 480 }}>
              <div style={{ background: '#fff5f5', border: '1px solid #f5c6c6', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem', color: '#C0392B', fontSize: '1rem' }}>⚠ Permanently delete your account</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#555', lineHeight: 1.5 }}>
                  This will permanently remove your account. This action cannot be undone. Existing survey
                  submissions will remain in the system but will no longer be linked to your account.
                </p>
              </div>

              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#555', marginBottom: '0.5rem' }}>
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.95rem', marginBottom: '1rem', boxSizing: 'border-box' }}
              />

              {deleteError && <p style={{ color: '#C0392B', fontSize: '0.85rem', margin: '0.5rem 0' }}>{deleteError}</p>}

              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirm !== 'DELETE'}
                style={{
                  ...btnPrimary,
                  background: deleteConfirm === 'DELETE' ? 'linear-gradient(135deg, #C0392B, #96281B)' : '#ccc',
                  cursor: deleteConfirm === 'DELETE' ? 'pointer' : 'not-allowed',
                }}
              >
                {deleting ? 'Deleting…' : 'Delete My Account'}
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const pageWrap = { maxWidth: 720, margin: '2.5rem auto', padding: '0 1.5rem' };
const card     = { background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', border: '1px solid #eee' };
const th       = { textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: '700', color: '#aaa', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const td       = { padding: '0.55rem 0.75rem', color: '#444' };
const btnPrimary = {
  padding: '0.65rem 1.75rem', borderRadius: '8px', border: 'none',
  background: 'linear-gradient(135deg, #C0392B 0%, #E67E22 100%)',
  color: 'white', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', marginTop: '0.5rem',
};
const btnSecondary = {
  padding: '0.4rem 0.9rem', borderRadius: '6px', border: '1px solid #ccc',
  background: 'white', color: '#555', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer',
};