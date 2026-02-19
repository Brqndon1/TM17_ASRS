'use client';

import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
      const response = await fetch('/api/categories');
      const data = await response.json();

      if (response.ok) {
        setCategories(data.categories || []);
        
        // Fetch linked initiatives for each category
        const initiativesMap = {};
        for (const category of (data.categories || [])) {
          try {
            const initiativesResponse = await fetch(
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

      const response = await fetch(url, {
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
      const response = await fetch(`/api/categories/${deleteTarget.category_id}`, {
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
      const response = await fetch('/api/initiative-categories', {
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
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
        <Header />
        <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
          <BackButton />
          <div className="asrs-card">
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔒</div>
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: '700',
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.5rem',
                }}
              >
                Unauthorized Access
              </h2>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  marginBottom: '0.5rem',
                  lineHeight: 1.6,
                }}
              >
                Only admin can manage categories.
              </p>
              <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                If you believe this is an error, please contact the administrator.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <BackButton />

        {/* Page Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: '700',
                color: 'var(--color-text-primary)',
                marginBottom: '0.4rem',
              }}
            >
              Categories
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', margin: 0 }}>
              Manage initiative categories. Maximum 7 categories allowed.
            </p>
          </div>
          <button
            onClick={handleAddClick}
            disabled={categories.length >= 7}
            className="asrs-btn-primary"
            style={{
              padding: '0.6rem 1rem',
              fontSize: '0.95rem',
              opacity: categories.length >= 7 ? 0.5 : 1,
              cursor: categories.length >= 7 ? 'not-allowed' : 'pointer',
            }}
          >
            + Create Category
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              backgroundColor: message.includes('successfully') ? '#e8f5e9' : '#ffebee',
              border: `1px solid ${
                message.includes('successfully') ? '#c8e6c9' : '#ffcdd2'
              }`,
              borderRadius: '8px',
              color: message.includes('successfully') ? '#2e7d32' : '#c62828',
              fontSize: '0.9rem',
            }}
          >
            {message}
          </div>
        )}

        {/* Category Count */}
        <div
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--color-bg-tertiary)',
            fontSize: '0.9rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          {categories.length} of 7 categories created
        </div>

        {/* Categories Table */}
        <div className="asrs-card" style={{ marginBottom: '2rem' }}>
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <p>No categories yet. Create your first category!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-bg-tertiary)' }}>
                    <th style={thStyle}>Category Name</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Created</th>
                    <th style={thStyle} align="right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <React.Fragment key={category.category_id}>
                      <tr
                        style={{
                          borderBottom: '1px solid var(--color-bg-tertiary)',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={tdStyle}>
                          <span style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                            {category.category_name}
                          </span>
                        </td>
                        <td style={tdStyle}>{category.description || '-'}</td>
                        <td style={tdStyle}>
                          {new Date(category.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <button
                            onClick={() => handleEditClick(category)}
                            style={actionButtonStyle}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(category)}
                            style={{ ...actionButtonStyle, marginLeft: '0.5rem' }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                      {/* Initiatives subrow */}
                      <tr style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                        <td colSpan="4" style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-bg-secondary)' }}>
                          <div style={{ paddingLeft: '1rem' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                              Linked Initiatives ({(categoryInitiatives[category.category_id] || []).length})
                            </div>
                            {(categoryInitiatives[category.category_id] || []).length === 0 ? (
                              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
                                No initiatives in this category yet.
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {(categoryInitiatives[category.category_id] || []).map((relationship) => (
                                  <div
                                    key={relationship.initiative_category_id}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      padding: '0.4rem 0.75rem',
                                      backgroundColor: 'var(--color-bg-primary)',
                                      border: '1px solid var(--color-bg-tertiary)',
                                      borderRadius: '6px',
                                      fontSize: '0.85rem',
                                    }}
                                  >
                                    <span style={{ color: 'var(--color-text-primary)' }}>
                                      {relationship.initiative_name}
                                    </span>
                                    <button
                                      onClick={() => handleRemoveInitiativeFromCategory(relationship.initiative_id, category.category_id)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#c62828',
                                        cursor: 'pointer',
                                        padding: '0',
                                        fontSize: '1.1rem',
                                        lineHeight: '1',
                                      }}
                                      title="Remove from category"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {(showAddForm || editingId) && (
        <div style={overlayStyle} onClick={() => {
          setShowAddForm(false);
          setEditingId(null);
        }}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
              {editingId ? 'Edit Category' : 'Create Category'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>
                  Category Name <span style={{ color: '#c62828' }}>*</span>
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
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                  }}
                  style={{
                    padding: '0.6rem 1.2rem',
                    border: '1px solid var(--color-bg-tertiary)',
                    background: 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: 'var(--color-text-primary)',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="asrs-btn-primary"
                  style={{
                    padding: '0.6rem 1.2rem',
                    fontSize: '0.95rem',
                    opacity: isSubmitting ? 0.6 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
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
            <h2 style={{ marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
              Confirm Deletion
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
              Are you sure you want to delete the category "
              <strong>{deleteTarget.category_name}</strong>"? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: '0.6rem 1.2rem',
                  border: '1px solid var(--color-bg-tertiary)',
                  background: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: 'var(--color-text-primary)',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#c62828',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.6 : 1,
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) e.currentTarget.style.backgroundColor = '#a01818';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#c62828';
                }}
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────

const thStyle = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontWeight: '700',
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#555',
};

const tdStyle = {
  padding: '0.75rem 1rem',
  color: 'var(--color-text-secondary)',
};

const actionButtonStyle = {
  padding: '0.4rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid var(--color-bg-tertiary)',
  background: 'white',
  cursor: 'pointer',
  color: '#2C3E50',
  fontWeight: '600',
  fontSize: '0.8rem',
  transition: 'background-color 0.15s',
};

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
  color: 'var(--color-text-primary)',
  marginBottom: '0.4rem',
  fontWeight: '600',
  fontSize: '0.9rem',
};

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid var(--color-bg-tertiary)',
  borderRadius: '8px',
  fontSize: '0.9rem',
  color: 'var(--color-text-primary)',
  backgroundColor: 'white',
  outline: 'none',
  boxSizing: 'border-box',
};
