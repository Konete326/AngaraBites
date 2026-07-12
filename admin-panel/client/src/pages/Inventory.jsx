import React, { useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useData } from '../context/DataContext';
import { Plus, Edit2, Trash2, AlertCircle, ShoppingCart, PlusCircle, CheckCircle, Package, DollarSign } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { getApiUrl } from '../utils/api';

const Inventory = () => {
  const { ingredients, setIngredients, refreshData } = useData();
  const [showModal, setShowModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [stockQuantity, setStockQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');

  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('add');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const handleOpenAdd = () => {
    setIsEditing(null);
    setName('');
    setUnit('kg');
    setStockQuantity('');
    setLowStockThreshold('10');
    setCostPerUnit('');
    setShowModal(true);
  };

  const handleOpenEdit = (ing) => {
    setIsEditing(ing);
    setName(ing.name);
    setUnit(ing.unit);
    setStockQuantity(String(ing.stockQuantity));
    setLowStockThreshold(String(ing.lowStockThreshold));
    setCostPerUnit(String(ing.costPerUnit || 0));
    setShowModal(true);
  };

  const handleOpenAdjust = (ing) => {
    setSelectedIngredient(ing);
    setAdjustQty('');
    setAdjustType('add');
    setShowAdjustModal(true);
  };

  const handleSaveIngredient = async (e) => {
    e.preventDefault();
    if (!name || !unit) return;

    const payload = {
      name,
      unit,
      stockQuantity: Number(stockQuantity) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 10,
      costPerUnit: Number(costPerUnit) || 0
    };

    try {
      if (isEditing) {
        await axios.put(getApiUrl(`/api/ingredients/${isEditing._id}`), payload);
      } else {
        await axios.post(getApiUrl('/api/ingredients'), payload);
      }
      refreshData();
      setShowModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedIngredient || !adjustQty) return;

    try {
      await axios.post(getApiUrl('/api/ingredients/adjust-stock'), {
        ingredientId: selectedIngredient._id,
        quantity: Number(adjustQty),
        type: adjustType
      });
      refreshData();
      setShowAdjustModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDelete = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(getApiUrl(`/api/ingredients/${deleteId}`));
      refreshData();
      setShowDeleteConfirm(false);
      setDeleteId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const ingredientsList = Array.isArray(ingredients) ? ingredients : [];
  const lowStockCount = ingredientsList.filter(ing => (ing.stockQuantity || 0) <= (ing.lowStockThreshold || 0)).length;
  const totalVal = ingredientsList.reduce((sum, ing) => sum + ((ing.stockQuantity || 0) * (ing.costPerUnit || 0)), 0);

  return (
    <Layout>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.75rem', fontWeight: '800' }}>Raw Materials Inventory</h1>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage raw ingredients, adjust stock levels, and configure thresholds.</p>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div className="glass-card" style={styles.statCard}>
            <Package size={24} color="var(--primary-yellow)" />
            <div>
              <div style={styles.statLabel}>Total Materials</div>
              <div style={styles.statValue}>{ingredientsList.length}</div>
            </div>
          </div>
          <div className="glass-card" style={styles.statCard}>
            <AlertCircle size={24} color={lowStockCount > 0 ? 'var(--accent-red)' : 'var(--text-muted)'} />
            <div>
              <div style={styles.statLabel}>Low Stock Alerts</div>
              <div style={{ ...styles.statValue, color: lowStockCount > 0 ? 'var(--accent-red)' : 'var(--text-main)', fontSize: '1.5rem', fontWeight: '800' }}>
                {lowStockCount}
              </div>
            </div>
          </div>
          <div className="glass-card" style={styles.statCard}>
            <DollarSign size={24} color="#4ade80" />
            <div>
              <div style={styles.statLabel}>Total Valuation</div>
              <div style={styles.statValue}>Rs. {totalVal.toLocaleString('en-PK')}</div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={styles.tableWrapper}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>MATERIAL NAME</th>
                <th>UNIT</th>
                <th>CURRENT STOCK</th>
                <th>LOW THRESHOLD</th>
                <th>COST/UNIT</th>
                <th>TOTAL VALUE</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {ingredientsList.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No ingredients found. Click 'Add Ingredient' to create one.
                  </td>
                </tr>
              ) : (
                ingredientsList.map((ing) => {
                  const isLow = (ing.stockQuantity || 0) <= (ing.lowStockThreshold || 0);
                  return (
                    <tr key={ing._id}>
                      <td style={{ fontWeight: '600' }}>{ing.name}</td>
                      <td>{ing.unit}</td>
                      <td style={{ fontWeight: '700', color: isLow ? 'var(--accent-red)' : 'var(--text-main)' }}>
                        {(ing.stockQuantity || 0).toFixed(2)}
                      </td>
                      <td>{ing.lowStockThreshold}</td>
                      <td>Rs. {ing.costPerUnit || 0}</td>
                      <td>Rs. {((ing.stockQuantity || 0) * (ing.costPerUnit || 0)).toFixed(0)}</td>
                      <td>
                        {isLow ? (
                          <span style={styles.lowBadge}>
                            <AlertCircle size={12} /> Low Stock
                          </span>
                        ) : (
                          <span style={styles.okBadge}>
                            <CheckCircle size={12} /> Good
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button onClick={() => handleOpenAdjust(ing)} className="btn-secondary" style={styles.actionBtnIcon} title="Adjust Stock">
                            <PlusCircle size={14} />
                          </button>
                          <button onClick={() => handleOpenEdit(ing)} className="btn-secondary" style={styles.actionBtnIcon} title="Edit">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleOpenDelete(ing._id)} className="btn-secondary" style={{ ...styles.actionBtnIcon, color: 'var(--accent-red)' }} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div style={styles.modalOverlay}>
            <form onSubmit={handleSaveIngredient} className="modal-card" style={styles.modal}>
              <h2 style={{ color: 'var(--text-main)', fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: '800' }}>
                {isEditing ? 'Edit Ingredient' : 'Add New Ingredient'}
              </h2>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Material Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={styles.input}
                  placeholder="e.g. Chicken (Boneless)"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Measurement Unit</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} style={styles.select}>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                    <option value="L">Liters (L)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="pcs">Pieces (pcs)</option>
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Low Stock Limit</label>
                  <input
                    type="number"
                    required
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    style={styles.input}
                    placeholder="10"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Current Stock Quantity</label>
                  <input
                    type="number"
                    step="any"
                    required={!isEditing}
                    disabled={isEditing}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    style={styles.input}
                    placeholder="0"
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Cost Per Unit (Rs.)</label>
                  <input
                    type="number"
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)}
                    style={styles.input}
                    placeholder="0"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save</button>
              </div>
            </form>
          </div>
        )}

        {showAdjustModal && (
          <div style={styles.modalOverlay}>
            <form onSubmit={handleAdjustStock} className="modal-card" style={styles.modal}>
              <h2 style={{ color: 'var(--text-main)', fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: '800' }}>
                Adjust Stock: {selectedIngredient?.name}
              </h2>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Adjustment Mode</label>
                <select value={adjustType} onChange={(e) => setAdjustType(e.target.value)} style={styles.select}>
                  <option value="add">Add (Restock)</option>
                  <option value="deduct">Deduct (Damage/Use)</option>
                  <option value="set">Set Absolute Value</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Quantity ({selectedIngredient?.unit})</label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  style={styles.input}
                  placeholder="0"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowAdjustModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Confirm</button>
              </div>
            </form>
          </div>
        )}

        {showDeleteConfirm && (
          <ConfirmModal
            isOpen={showDeleteConfirm}
            title="Delete Material"
            message="Are you sure you want to delete this ingredient? Any item recipes referencing it will have broken references."
            onConfirm={handleDelete}
            onClose={() => { setShowDeleteConfirm(false); setDeleteId(null); }}
            confirmText="Delete"
            type="danger"
          />
        )}
      </div>
    </Layout>
  );
};

const styles = {
  container: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    width: '100%'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem'
  },
  statCard: {
    padding: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: 'var(--text-main)',
    marginTop: '0.25rem'
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '16px',
    border: '1px solid var(--glass-border)'
  },
  lowBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--accent-red)',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '700'
  },
  okBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    color: '#4ade80',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '700'
  },
  actionBtnIcon: {
    padding: '0.4rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-main)',
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    backdropFilter: 'blur(8px)'
  },
  modal: {
    width: '90%',
    maxWidth: '440px',
    padding: '1.5rem'
  },
  inputGroup: {
    marginBottom: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  },
  label: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: '600'
  },
  input: {
    padding: '0.75rem',
    borderRadius: '10px',
    border: '2px solid var(--glass-border)',
    backgroundColor: 'var(--bg-main)',
    color: 'var(--text-main)',
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%'
  },
  select: {
    padding: '0.75rem',
    borderRadius: '10px',
    border: '2px solid var(--glass-border)',
    backgroundColor: 'var(--bg-main)',
    color: 'var(--text-main)',
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%'
  }
};

export default Inventory;
