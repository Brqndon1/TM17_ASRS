'use client';

import PageLayout from '@/components/PageLayout';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';

// Category card accent colors (cycle through)
const CARD_COLORS = ['#3B82F6', '#10B981', '#E67E22', '#8B5CF6', '#14B8A6', '#F59E0B', '#EF4444'];

export default function CategoriesPage() {
  const [userRole, setUserRole] = useState('public');
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState({
    category_name: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryInitiatives, setCategoryInitiatives] = useState({});
  const router = useRouter();

  // Check for logged-in user and set their role
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserRole(user.user_type || 'public');
    }
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    if (userRole === 'admin') {
      fetchCategories();
    }
  }, [userRole]);

  // Auto-clear message after 4 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await apiFetch('/api/categories');
      const data = await response.json();

      if (response.ok) {
        setCategories(data.categories || []);

        // Fetch linked initiatives for each category
        const initiativesMap = {};
        for (const category of (data.categories || [])) {
          try {
            const initiativesResponse = await apiFetch(
              `/api/initiative-categories?category_id=${category.category_id}`
            );
            const initiativesData = await initiativesResponse.json();
            if (initiativesResponse.ok) {
              initiativesMap[category.category_id] = initiativesData.relationships || [];
            }
          } catch (error) {
            console.error(`Error fetching initiatives for category ${category.category_id}:`, error);
          }
        }
        setCategoryInitiatives(initiativesMap);
      } else {
        setMessage('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setMessage('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClick = () => {
    setShowAddForm(true);
    setFormData({ category_name: '', description: '' });
    setMessage('');
  };

  const handleEditClick = (category) => {
    setEditingId(category.category_id);
    setFormData({
      category_name: category.category_name,
      description: category.description || '',
    });
    setMessage('');
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    if (!formData.category_name.trim()) {
      setMessage('Please enter a category name.');
      setIsSubmitting(false);
      return;
    }

    try {
      const url = editingId
        ? `/api/categories/${editingId}`
        : '/api/categories';
      const method = editingId ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(
          editingId
            ? 'Category updated successfully!'
            : 'Category created successfully!'
        );
        setShowAddForm(false);
        setEditingId(null);
        setFormData({ category_name: '', description: '' });
        setTimeout(() => fetchCategories(), 500);
      } else {
        setMessage(`${data.error || 'Failed to save category'}`);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      setMessage('Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await apiFetch(`/api/categories/${deleteTarget.category_id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Category deleted successfully!');
        setDeleteTarget(null);
        setTimeout(() => fetchCategories(), 500);
      } else {
        setMessage(`${data.error || 'Failed to delete category'}`);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      setMessage('Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveInitiativeFromCategory = async (initiativeId, categoryId) => {
    try {
      const response = await apiFetch('/api/initiative-categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initiative_id: initiativeId,
          category_id: categoryId,
        }),
      });

      if (response.ok) {
        setMessage('Initiative removed from category!');
        setTimeout(() => fetchCategories(), 500);
      } else {
        const data = await response.json();
        setMessage(`${data.error || 'Failed to remove initiative'}`);
      }
    } catch (error) {
      console.error('Error removing initiative:', error);
      setMessage('Connection error. Please try again.');
    }
  };

  if (userRole !== 'admin') {
    return (
      <PageLayout title="Categories">
        <div className="card" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔒</div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
              Unauthorized Access
            </h2>
            <p style={{ color: '#6B7280', marginBottom: '0.5rem', lineHeight: 1.6 }}>
              Only admin can manage categories.
            </p>
            <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>
              If you believe this is an error, please contact the administrator.
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Build mapping table rows: flatten all category→initiative relationships
  const mappingRows = categories.flatMap((cat, catIdx) =>
    (categoryInitiatives[cat.category_id] || []).map((rel) => ({
      category: cat,
      catIdx,
      rel,
    }))
  );

  return (
    <PageLayout title="Categories">
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '4px', margin: 0 }}>Categories</h1>
          <p style={{ color: '#6B7280', fontSize: '13px', margin: '4px 0 0' }}>
            Manage initiative categories. {categories.length}/7 created.
          </p>
        </div>
        <button
          onClick={handleAddClick}
          disabled={categories.length >= 7}
          className="btn-primary"
          style={{ opacity: categories.length >= 7 ? 0.5 : 1, cursor: categories.length >= 7 ? 'not-allowed' : 'pointer' }}
        >
          + Create Category
        </button>
      </div>

      {/* Status message */}
      {message && (
        <div style={{
          padding: '10px 16px',
          marginBottom: '20px',
          backgroundColor: message.includes('successfully') ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${message.includes('successfully') ? '#A7F3D0' : '#FECACA'}`,
          borderRadius: '8px',
          color: message.includes('successfully') ? '#059669' : '#DC2626',
          fontSize: '13px',
        }}>
          {message}
        </div>
      )}

      {/* Category grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
          No categories yet. Create your first category!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {categories.map((category, idx) => {
            const accentColor = CARD_COLORS[idx % CARD_COLORS.length];
            const initiativeCount = (categoryInitiatives[category.category_id] || []).length;

            return (
              <div
                key={category.category_id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  borderTop: `4px solid ${accentColor}`,
                  padding: '20px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: 0 }}>
                    {category.category_name}
                  </h3>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: accentColor + '18',
                    color: accentColor,
                    fontSize: '11px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                  }}>
                    {initiativeCount} initiative{initiativeCount !== 1 ? 's' : ''}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px', lineHeight: '1.5', minHeight: '40px' }}>
                  {category.description || 'No description provided.'}
                </p>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => handleEditClick(category)}
                    style={{ fontSize: '12px', fontWeight: '600', color: accentColor, background: 'none', border: 'none', cursor: 'pointer', padding: '0', textDecoration: 'underline' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(category)}
                    style={{ fontSize: '12px', fontWeight: '600', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: '0', textDecoration: 'underline' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category-Initiative Mapping Table */}
      {!isLoading && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Category–Initiative Mapping</span>
          </div>
          {mappingRows.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '2rem', fontSize: '13px' }}>
              No initiatives have been assigned to categories yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Initiative</th>
                    <th>Status</th>
                    <th>Start Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mappingRows.map(({ category, catIdx, rel }) => {
                    const dotColor = CARD_COLORS[catIdx % CARD_COLORS.length];
                    return (
                      <tr key={`${category.category_id}-${rel.initiative_id}`}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
                            <span style={{ fontWeight: '600', color: '#111827' }}>{category.category_name}</span>
                          </div>
                        </td>
                        <td style={{ color: '#374151' }}>{rel.initiative_name}</td>
                        <td>
                          <span className={`pill ${rel.status === 'active' ? 'pill-green' : rel.status === 'pending' ? 'pill-yellow' : 'pill-gray'}`}>
                            {rel.status || 'Active'}
                          </span>
                        </td>
                        <td style={{ color: '#6B7280' }}>
                          {rel.start_date ? new Date(rel.start_date).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleRemoveInitiativeFromCategory(rel.initiative_id, category.category_id)}
                            style={{ fontSize: '12px', fontWeight: '600', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: '0' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddForm || editingId) && (
        <div style={overlayStyle} onClick={() => { setShowAddForm(false); setEditingId(null); }}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', color: '#111827', fontSize: '18px', fontWeight: '700' }}>
              {editingId ? 'Edit Category' : 'Create Category'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>
                  Category Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.category_name}
                  onChange={(e) => handleFormChange('category_name', e.target.value)}
                  placeholder="e.g., Performance Metrics"
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setEditingId(null); }}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >
                  {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={overlayStyle} onClick={() => setDeleteTarget(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', color: '#111827', fontSize: '18px', fontWeight: '700' }}>
              Confirm Deletion
            </h2>
            <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>
              Are you sure you want to delete the category &quot;
              <strong>{deleteTarget.category_name}</strong>
              &quot;? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteTarget(null)} className="btn-outline">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#DC2626',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.6 : 1,
                }}
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

// ── Shared styles ────────────────────────────────────────

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 200,
};

const modalStyle = {
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '1.75rem',
  maxWidth: '500px',
  width: '90%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};

const labelStyle = {
  display: 'block',
  color: '#111827',
  marginBottom: '0.4rem',
  fontWeight: '600',
  fontSize: '13px',
};

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  fontSize: '13px',
  color: '#111827',
  backgroundColor: 'white',
  outline: 'none',
  boxSizing: 'border-box',
};
