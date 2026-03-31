'use client';

import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/client';

export default function FormCreationPage() {
  const [userRole, setUserRole] = useState('staff');
  const [initiatives, setInitiatives] = useState([]);
  const [fieldCatalog, setFieldCatalog] = useState({ common: [], initiative_specific: [], staff_only: [] });
  const [selectedInitiative, setSelectedInitiative] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [selectedFields, setSelectedFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/initiatives').then(r => r.json()),
      apiFetch('/api/admin/fields').then(r => r.json()),
    ]).then(([initData, fieldData]) => {
      setInitiatives(Array.isArray(initData) ? initData : initData.initiatives || []);
      setFieldCatalog(fieldData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const availableFields = [
    ...fieldCatalog.common,
    ...fieldCatalog.initiative_specific.filter(f =>
      !selectedInitiative || f.initiative_id === Number(selectedInitiative)
    ),
  ];

  const addField = (field) => {
    if (selectedFields.some(sf => sf.field_id === field.field_id)) return;
    setSelectedFields([...selectedFields, {
      field_id: field.field_id,
      field_key: field.field_key,
      field_label: field.field_label,
      field_type: field.field_type,
      scope: field.scope,
      required: !!field.is_required_default,
      help_text: '',
      validation_rules: null,
    }]);
  };

  const removeField = (fieldId) => {
    setSelectedFields(selectedFields.filter(f => f.field_id !== fieldId));
  };

  const updateFieldConfig = (fieldId, key, value) => {
    setSelectedFields(selectedFields.map(f =>
      f.field_id === fieldId ? { ...f, [key]: value } : f
    ));
  };

  const moveField = (index, direction) => {
    const copy = [...selectedFields];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= copy.length) return;
    [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
    setSelectedFields(copy);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return alert('Please enter a form name');
    if (!selectedInitiative) return alert('Please select an initiative');
    if (selectedFields.length === 0) return alert('Please add at least one field');

    setSaving(true);
    try {
      const payload = {
        title: formName,
        description: formDescription,
        initiative_id: Number(selectedInitiative),
        questions: selectedFields.map(f => ({
          field_id: f.field_id,
          question: f.field_label,
          type: f.field_type,
          required: f.required,
          help_text: f.help_text || undefined,
          scope: f.scope,
          form_validation_rules: f.validation_rules || undefined,
        })),
      };

      const res = await apiFetch('/api/surveys/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Unknown error');
      alert('Form created successfully!');
      setFormName('');
      setFormDescription('');
      setSelectedFields([]);
    } catch (err) {
      alert('Error: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const cardStyle = { padding: '1.5rem', marginBottom: '1.5rem' };
  const labelStyle = { display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' };
  const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--color-bg-tertiary)', fontSize: '1rem' };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
        <Header userRole={userRole} onRoleChange={setUserRole} />
        <main style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem', textAlign: 'center' }}>
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header userRole={userRole} onRoleChange={setUserRole} />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <BackButton />
        <form onSubmit={handleSubmit}>
          {/* Form Details */}
          <div className="asrs-card" style={cardStyle}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>Form Creation</h1>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Initiative *</label>
              <select value={selectedInitiative} onChange={e => setSelectedInitiative(e.target.value)} required style={inputStyle}>
                <option value="">Select an initiative...</option>
                {initiatives.map(i => (
                  <option key={i.initiative_id || i.id} value={i.initiative_id || i.id}>
                    {i.initiative_name || i.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Form Name *</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} required placeholder="e.g. Student Experience Survey" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Description</label>
              <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Brief description of this form" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>

          {/* Field Catalog */}
          <div className="asrs-card" style={cardStyle}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Field Catalog</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Click a field to add it to your form. Common fields are shared across all initiatives.
              {selectedInitiative ? ' Initiative-specific fields for the selected initiative are also shown.' : ' Select an initiative to see initiative-specific fields.'}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {availableFields.map(f => {
                const isAdded = selectedFields.some(sf => sf.field_id === f.field_id);
                return (
                  <button key={f.field_id} type="button" onClick={() => addField(f)} disabled={isAdded}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: 20, fontSize: '0.875rem', cursor: isAdded ? 'default' : 'pointer',
                      border: `1px solid ${f.scope === 'common' ? 'var(--color-asrs-blue, #3b82f6)' : 'var(--color-asrs-orange, #f97316)'}`,
                      backgroundColor: isAdded ? 'var(--color-bg-tertiary)' : 'var(--color-bg-primary)',
                      color: isAdded ? 'var(--color-text-light)' : 'var(--color-text-primary)',
                      opacity: isAdded ? 0.5 : 1,
                    }}>
                    {f.field_label} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>({f.field_type})</span>
                    {f.scope === 'initiative_specific' && <span style={{ fontSize: '0.7rem', marginLeft: 4, color: 'var(--color-asrs-orange, #f97316)' }}>initiative</span>}
                  </button>
                );
              })}
              {availableFields.length === 0 && (
                <p style={{ color: 'var(--color-text-light)', fontStyle: 'italic' }}>No fields in catalog. Create fields first via the admin panel.</p>
              )}
            </div>
          </div>

          {/* Selected Fields */}
          <div className="asrs-card" style={cardStyle}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
              Form Fields ({selectedFields.length})
            </h2>

            {selectedFields.length === 0 ? (
              <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: '2rem' }}>
                No fields added yet. Select fields from the catalog above.
              </p>
            ) : (
              selectedFields.map((sf, idx) => (
                <div key={sf.field_id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                  marginBottom: '0.5rem', borderRadius: 8, border: '1px solid var(--color-bg-tertiary)',
                  backgroundColor: 'var(--color-bg-secondary)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button type="button" onClick={() => moveField(idx, -1)} disabled={idx === 0}
                      className="asrs-btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>^</button>
                    <button type="button" onClick={() => moveField(idx, 1)} disabled={idx === selectedFields.length - 1}
                      className="asrs-btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>v</button>
                  </div>

                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>{sf.field_label}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginLeft: 8 }}>
                      {sf.field_type} | {sf.scope}
                    </span>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                    <input type="checkbox" checked={sf.required} onChange={e => updateFieldConfig(sf.field_id, 'required', e.target.checked)} />
                    Required
                  </label>

                  <input placeholder="Help text" value={sf.help_text} onChange={e => updateFieldConfig(sf.field_id, 'help_text', e.target.value)}
                    style={{ width: 200, padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid var(--color-bg-tertiary)', fontSize: '0.85rem' }} />

                  <button type="button" onClick={() => removeField(sf.field_id)}
                    className="asrs-btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>Remove</button>
                </div>
              ))
            )}
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="submit" disabled={saving} className="asrs-btn-primary" style={{ padding: '0.75rem 2rem' }}>
              {saving ? 'Creating...' : 'Create Form'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
