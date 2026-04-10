'use client';

import PageLayout from '@/components/PageLayout';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/client';

// Question type labels + icons
const QUESTION_TYPE_DEFS = [
  { type: 'text',       label: 'Short Text',    icon: '📝' },
  { type: 'textarea',   label: 'Long Text',     icon: '📄' },
  { type: 'number',     label: 'Number',        icon: '🔢' },
  { type: 'select',     label: 'Dropdown',      icon: '⌄' },
  { type: 'checkbox',   label: 'Checkbox',      icon: '☑' },
  { type: 'radio',      label: 'Multiple Choice', icon: '⊙' },
  { type: 'date',       label: 'Date',          icon: '📅' },
  { type: 'rating',     label: 'Rating',        icon: '★' },
  { type: 'email',      label: 'Email',         icon: '@' },
  { type: 'url',        label: 'URL / Link',    icon: '🔗' },
];

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
      apiFetch('/api/admin/fields').then(r => {
        if (!r.ok) return { common: [], initiative_specific: [], staff_only: [] };
        return r.json();
      }),
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

  if (loading) {
    return (
      <PageLayout title="Surveys">
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>Loading...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Surveys">
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>Form Builder</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              if (selectedFields.length === 0) { alert('Add questions first to preview.'); return; }
              alert(`Preview: ${formName || 'Untitled Form'}\n${selectedFields.length} question(s)`);
            }}
          >
            Preview Form
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={saving}
            onClick={handleSubmit}
            style={{ opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving...' : 'Save Form'}
          </button>
        </div>
      </div>

      {/* Builder layout: 60/40 split */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ── Left: Canvas (60%) ── */}
        <div style={{ flex: '3 1 400px', minWidth: 0 }}>
          {/* Empty state */}
          {selectedFields.length === 0 && (
            <div style={{
              border: '2px dashed #E5E7EB',
              borderRadius: '12px',
              padding: '48px 24px',
              textAlign: 'center',
              color: '#9CA3AF',
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
              <p style={{ fontWeight: '600', margin: '0 0 4px' }}>No questions yet</p>
              <p style={{ fontSize: '13px', margin: 0 }}>Add question types from the palette on the right</p>
            </div>
          )}

          {/* Question blocks */}
          {selectedFields.map((sf, idx) => {
            const typeDef = QUESTION_TYPE_DEFS.find(t => t.type === sf.field_type) || { label: sf.field_type, icon: '?' };
            return (
              <div
                key={sf.field_id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                {/* Drag handle + order buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '2px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => moveField(idx, -1)}
                    disabled={idx === 0}
                    style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 0.6, fontSize: '14px', padding: '0', lineHeight: '1' }}
                  >▲</button>
                  <div style={{ color: '#D1D5DB', fontSize: '18px', lineHeight: '1', textAlign: 'center' }}>⠿</div>
                  <button
                    type="button"
                    onClick={() => moveField(idx, 1)}
                    disabled={idx === selectedFields.length - 1}
                    style={{ background: 'none', border: 'none', cursor: idx === selectedFields.length - 1 ? 'default' : 'pointer', opacity: idx === selectedFields.length - 1 ? 0.3 : 0.6, fontSize: '14px', padding: '0', lineHeight: '1' }}
                  >▼</button>
                </div>

                {/* Question content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#FFF7ED', color: '#E67E22', border: '1px solid #FED7AA' }}>
                      {typeDef.icon} {typeDef.label}
                    </span>
                    {sf.scope === 'initiative_specific' && (
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '9999px', backgroundColor: '#EFF6FF', color: '#2563EB' }}>initiative</span>
                    )}
                    {sf.required && (
                      <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: '600' }}>required</span>
                    )}
                  </div>

                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827', marginBottom: '6px' }}>
                    {sf.field_label}
                  </div>

                  {/* Preview field */}
                  {(sf.field_type === 'text' || sf.field_type === 'email' || sf.field_type === 'url' || sf.field_type === 'number' || sf.field_type === 'date') && (
                    <div style={{ height: '32px', border: '1px solid #E5E7EB', borderRadius: '6px', backgroundColor: '#F9FAFB' }} />
                  )}
                  {sf.field_type === 'textarea' && (
                    <div style={{ height: '56px', border: '1px solid #E5E7EB', borderRadius: '6px', backgroundColor: '#F9FAFB' }} />
                  )}
                  {sf.field_type === 'rating' && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: '18px', color: '#D1D5DB' }}>★</span>)}
                    </div>
                  )}

                  {/* Config row */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#6B7280', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={sf.required}
                        onChange={e => updateFieldConfig(sf.field_id, 'required', e.target.checked)}
                      />
                      Required
                    </label>
                    <input
                      placeholder="Help text (optional)"
                      value={sf.help_text}
                      onChange={e => updateFieldConfig(sf.field_id, 'help_text', e.target.value)}
                      style={{ flex: 1, minWidth: '140px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '12px', color: '#374151', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => removeField(sf.field_id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '18px', padding: '0', flexShrink: 0 }}
                  title="Remove question"
                >×</button>
              </div>
            );
          })}

          {/* Add question prompt — always visible at bottom of canvas */}
          <div style={{
            border: '2px dashed #D1D5DB',
            borderRadius: '12px',
            padding: '20px 24px',
            textAlign: 'center',
            color: '#9CA3AF',
            cursor: 'default',
            marginBottom: '8px',
          }}>
            <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>+</span>
            <span style={{ fontSize: '13px' }}>Choose a question type from the right to add it here</span>
          </div>
        </div>

        {/* ── Right: Palette (40%) ── */}
        <div style={{ flex: '2 1 280px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Form Settings — moved to top so users see it first */}
          <div className="card" style={{ padding: '20px' }}>
            <div className="card-header" style={{ marginBottom: '12px' }}>
              <span className="card-title">Form Settings</span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Initiative *
              </label>
              <select
                value={selectedInitiative}
                onChange={e => setSelectedInitiative(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '13px', color: '#111827', backgroundColor: 'white', outline: 'none' }}
              >
                <option value="">Select an initiative...</option>
                {initiatives.map(i => (
                  <option key={i.initiative_id || i.id} value={i.initiative_id || i.id}>
                    {i.initiative_name || i.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Form Title *
              </label>
              <input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                required
                placeholder="e.g. Student Experience Survey"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '13px', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Brief description of this form..."
                rows={3}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '13px', color: '#111827', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            {selectedFields.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F3F4F6', fontSize: '12px', color: '#6B7280' }}>
                <strong style={{ color: '#111827' }}>{selectedFields.length}</strong> question{selectedFields.length !== 1 ? 's' : ''} added
              </div>
            )}
          </div>

          {/* Add a Question */}
          <div className="card" style={{ padding: '20px' }}>
            <div className="card-header" style={{ marginBottom: '4px' }}>
              <span className="card-title">Add a Question</span>
            </div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 12px' }}>
              Click a type below to add it to your form
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {QUESTION_TYPE_DEFS.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => {
                    const catalogField = availableFields.find(f => f.field_type === t.type);
                    if (catalogField) {
                      addField(catalogField);
                    } else {
                      const syntheticId = `synthetic-${t.type}-${Date.now()}`;
                      setSelectedFields(prev => [...prev, {
                        field_id: syntheticId,
                        field_key: t.type,
                        field_label: t.label,
                        field_type: t.type,
                        scope: 'common',
                        required: false,
                        help_text: '',
                        validation_rules: null,
                      }]);
                    }
                  }}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#F9FAFB',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#374151',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background-color 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FFF7ED'; e.currentTarget.style.borderColor = '#E67E22'; e.currentTarget.style.color = '#E67E22'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#374151'; }}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Saved Questions — only show if catalog has fields */}
          {availableFields.length > 0 && (
            <div className="card" style={{ padding: '20px' }}>
              <div className="card-header" style={{ marginBottom: '4px' }}>
                <span className="card-title">Saved Questions</span>
              </div>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 12px' }}>
                Pre-configured questions from your organization. Click to add.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {availableFields.map(f => {
                  const isAdded = selectedFields.some(sf => sf.field_id === f.field_id);
                  return (
                    <button
                      key={f.field_id}
                      type="button"
                      onClick={() => addField(f)}
                      disabled={isAdded}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        cursor: isAdded ? 'default' : 'pointer',
                        border: `1px solid ${isAdded ? '#E5E7EB' : f.scope === 'common' ? '#BFDBFE' : '#FED7AA'}`,
                        backgroundColor: isAdded ? '#F3F4F6' : f.scope === 'common' ? '#EFF6FF' : '#FFF7ED',
                        color: isAdded ? '#9CA3AF' : f.scope === 'common' ? '#2563EB' : '#E67E22',
                        opacity: isAdded ? 0.6 : 1,
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isAdded && <span>&#10003;</span>}
                      {f.field_label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
