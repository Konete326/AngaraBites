import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Spinner } from '../components/ui/spinner-1';
import ConfirmModal from '../components/ConfirmModal';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { useData } from '../context/DataContext';


const CategoryFormModal = ({ onClose, onAdd, existingCategories = [] }) => {
  const [name, setName] = useState('');
  const [subCategoriesInput, setSubCategoriesInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const subCategories = subCategoriesInput.split(',').map(s => s.trim()).filter(s => s);
    await onAdd({ name, subCategories });
    setIsSubmitting(false);
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>Create Category</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Add a new category to organize your menu</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn} className="hover-scale"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Category Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Burgers"
              required
              autoFocus
              list="category-suggestions"
            />
            <datalist id="category-suggestions">
              {existingCategories.map((c, i) => (
                <option key={i} value={c.name} />
              ))}
            </datalist>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Sub Categories (comma separated)</label>
            <input
              type="text"
              value={subCategoriesInput}
              onChange={(e) => setSubCategoriesInput(e.target.value)}
              placeholder="e.g. Burgers, Pizzas, Drinks"
            />
          </div>
          <div style={styles.formActions}>
            <button type="button" onClick={onClose} className="btn-secondary" style={styles.cancelBtn}>Cancel</button>
            <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Categories = () => {
  const { categories, items, isDataLoading, refreshData } = useData();
  const [isEditing, setIsEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSubCategories, setEditSubCategories] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [cascadeModalConfig, setCascadeModalConfig] = useState(null);

  // Fetching handled by DataContext

  const handleAdd = async ({ name, subCategories }) => {
    try {
      // Check if the category already exists
      const existing = categories.find(c => c?.name?.toLowerCase() === name?.toLowerCase());

      if (existing) {
        // Merge existing subcategories with new ones, avoiding duplicates
        const mergedSubCategories = Array.from(new Set([...(existing.subCategories || []), ...subCategories]));

        await api.put(`/api/categories/${existing._id}`, {
          name: existing.name,
          subCategories: mergedSubCategories
        });
      } else {
        await api.post('/api/categories', { name, subCategories });
      }

      setShowModal(false);
      refreshData();

    } catch (err) {
      console.error("Category Add Error: ", err);
      alert(err.response?.data?.message || err.message || 'Error saving category');
    }
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/categories/${deleteId}`);
      refreshData();
      setDeleteId(null);
    } catch (err) {
      alert('Error deleting category');
    }
  };

  const handleCascadeConfirm = async () => {
    if (!cascadeModalConfig) return;
    try {
      const { categoryId, name, subCategories, mappings } = cascadeModalConfig;
      const subCategoryMappings = {};
      Object.entries(mappings).forEach(([oldSub, newSub]) => {
        subCategoryMappings[oldSub] = newSub || null;
      });

      await api.put(`/api/categories/${categoryId}`, {
        name,
        subCategories,
        subCategoryMappings
      });

      setCascadeModalConfig(null);
      setIsEditing(null);
      refreshData();
    } catch (err) {
      alert('Error updating category and subcategories mapping');
    }
  };


  const handleEdit = (category) => {
    setIsEditing(category._id);
    setEditName(category.name);
    setEditSubCategories((category.subCategories || []).join(', '));
  };

  const handleUpdate = async (id) => {
    try {
      const subCategories = editSubCategories.split(',').map(s => s.trim()).filter(s => s);
      const oldCat = categories.find(c => c._id === id);
      const oldSubCats = oldCat?.subCategories || [];
      const removedSubCats = oldSubCats.filter(sub => !subCategories.includes(sub));

      if (removedSubCats.length > 0) {
        const affectedItems = (items || []).filter(item => 
          item.category?._id === id && 
          item.subCategory && 
          removedSubCats.includes(item.subCategory)
        );

        if (affectedItems.length > 0) {
          const initialMappings = {};
          removedSubCats.forEach(sub => {
            initialMappings[sub] = '';
          });
          setCascadeModalConfig({
            isOpen: true,
            categoryId: id,
            name: editName,
            subCategories,
            removedSubCats,
            affectedItems,
            mappings: initialMappings
          });
          return;
        }
      }

      await api.put(`/api/categories/${id}`, {
        name: editName,
        subCategories
      });
      setIsEditing(null);
      refreshData();
    } catch (err) {
      alert('Error updating category');
    }
  };


  if (isDataLoading) {
    return (
      <Layout>
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.sectionTitle}>Product Categories</h2>
          <p style={styles.sectionSubtitle}>Manage your store categories here.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={20} /> Add Category
        </button>
      </div>

      <div className="glass-card" style={styles.tableCard}>
        {categories.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>NAME</th>
                <th style={styles.th}>SUB CATEGORIES</th>
                <th style={styles.th}>DATE</th>
                <th style={styles.th}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat._id} style={styles.tr}>
                  <td style={styles.td}>
                    {isEditing === cat._id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={styles.inlineInput}
                      />
                    ) : (
                      <span style={styles.catName}>{cat.name}</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {isEditing === cat._id ? (
                      <input
                        value={editSubCategories}
                        onChange={(e) => setEditSubCategories(e.target.value)}
                        style={styles.inlineInput}
                      />
                    ) : (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {(cat.subCategories || []).map((sub, i) => (
                          <span key={i} style={styles.subCategoryBadge}>{sub}</span>
                        ))}
                        {(!cat.subCategories || cat.subCategories.length === 0) && '-'}
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>
                    {new Date(cat.createdAt).toLocaleDateString()}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      {isEditing === cat._id ? (
                        <>
                          <button onClick={() => handleUpdate(cat._id)} style={styles.actionBtnCheck}>
                            <Check size={18} />
                          </button>
                          <button onClick={() => setIsEditing(null)} style={styles.actionBtnCancel}>
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(cat)} style={styles.actionBtnEdit}>
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => confirmDelete(cat._id)} style={styles.actionBtnDelete} className="hover-scale">
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No categories found.
          </p>
        )}
      </div>

      {showModal && (
        <CategoryFormModal
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
          existingCategories={categories}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
      />

      {cascadeModalConfig && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, maxWidth: '550px' }}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>Subcategory Rename / Move</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Please decide how to map products belonging to the removed/renamed subcategories:
                </p>
              </div>
              <button onClick={() => setCascadeModalConfig(null)} style={styles.closeBtn} className="hover-scale">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
              {cascadeModalConfig.removedSubCats.map((oldSub, idx) => {
                const affected = cascadeModalConfig.affectedItems.filter(item => item.subCategory === oldSub);
                if (affected.length === 0) return null;

                return (
                  <div key={idx} style={{ padding: '1rem', border: '1px solid var(--glass-border)', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-yellow)', marginBottom: '0.5rem' }}>
                      Subcategory: "{oldSub}"
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
                      Affected Products: {affected.map(item => item.name).join(', ')}
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Map to active subcategory:</label>
                      <select
                        value={cascadeModalConfig.mappings[oldSub] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCascadeModalConfig(prev => ({
                            ...prev,
                            mappings: {
                              ...prev.mappings,
                              [oldSub]: val
                            }
                          }));
                        }}
                        style={styles.inlineInput}
                      >
                        <option value="">Set as Uncategorized</option>
                        {cascadeModalConfig.subCategories.map((newSub, i) => (
                          <option key={i} value={newSub}>Move to "{newSub}"</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={styles.formActions}>
              <button onClick={() => setCascadeModalConfig(null)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleCascadeConfirm} className="btn-primary" style={styles.submitBtn}>
                Confirm and Save
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

const styles = {
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
  },
  sectionTitle: {
    fontSize: '1.3rem',
    fontWeight: '800',
    color: 'var(--text-main)',
  },
  sectionSubtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
  },
  tableCard: {
    padding: '1rem',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '1rem',
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    fontWeight: '700',
    letterSpacing: '1px',
    borderBottom: '1px solid var(--glass-border)',
  },
  tr: {
    borderBottom: '1px solid var(--glass-border)',
  },
  td: {
    padding: '1.25rem 1rem',
    color: 'var(--text-main)',
    fontSize: '0.95rem',
  },
  catName: {
    fontWeight: '600',
    color: 'var(--primary-yellow)',
  },
  subCategoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: 'var(--text-main)',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
  },
  actionBtnEdit: {
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  actionBtnDelete: {
    color: 'var(--accent-red)',
    cursor: 'pointer',
  },
  actionBtnCheck: {
    color: '#4ade80',
    cursor: 'pointer',
  },
  actionBtnCancel: {
    color: 'var(--accent-red)',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
  },
  modal: {
    width: '90%',
    maxWidth: '450px',
    padding: '2rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '20px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid var(--glass-border)',
    transform: 'translateY(0)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
  },
  closeBtn: {
    color: 'var(--text-muted)',
    backgroundColor: 'var(--glass)',
    padding: '0.5rem',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  cancelBtn: {
    flex: 1,
    padding: '0.8rem',
    borderRadius: '12px',
    backgroundColor: 'transparent',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-main)',
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    padding: '0.8rem',
    borderRadius: '12px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  inlineInput: {
    width: '100%',
    padding: '0.8rem 1rem',
    borderRadius: '10px',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'var(--glass)',
    color: 'var(--text-main)',
    fontSize: '0.95rem',
    transition: 'all 0.3s ease',
  }
};

export default Categories;
