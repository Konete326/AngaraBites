import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Spinner } from '../components/ui/spinner-1';
import ConfirmModal from '../components/ConfirmModal';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  FileText,
  Search,
  RefreshCw,
  Calendar,
  DollarSign,
  TrendingUp
} from 'lucide-react';

const ExpenseFormModal = ({ onClose, onSave, initialData }) => {
  const [amount, setAmount] = useState(initialData ? initialData.amount : '');
  const [description, setDescription] = useState(initialData ? initialData.description : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSave({ amount: Number(amount), description });
    setIsSubmitting(false);
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>
              {initialData ? 'Edit Expense' : 'Add Expense'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Record daily expenses for your restaurant
            </p>
          </div>
          <button onClick={onClose} style={styles.closeBtn} className="hover-scale"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Amount (Rs.)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 1500"
              required
              autoFocus
              style={styles.inputField}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Bought vegetables"
              required
              style={{...styles.inputField, minHeight: '80px', resize: 'vertical'}}
            />
          </div>
          <div style={styles.formActions}>
            <button type="button" onClick={onClose} className="btn-secondary" style={styles.cancelBtn}>Cancel</button>
            <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper: get current business date string (YYYY-MM-DD)
// Business day starts at 5 PM (17:00) local time.
// Before 5 PM → business date is yesterday; after 5 PM → today.
const getBusinessDateStr = () => {
  const now = new Date();
  const BUSINESS_START_HOUR = 17;
  const biz = new Date(now);
  if (now.getHours() < BUSINESS_START_HOUR) {
    biz.setDate(biz.getDate() - 1); // yesterday
  }
  const y   = biz.getFullYear();
  const m   = String(biz.getMonth() + 1).padStart(2, '0');
  const day = String(biz.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getBusinessMonthStr = () => {
  const now = new Date();
  const BUSINESS_START_HOUR = 17;
  const biz = new Date(now);
  // If it's the 1st of the month and before 5 PM, we're still in last month's business day
  if (now.getDate() === 1 && now.getHours() < BUSINESS_START_HOUR) {
    biz.setDate(0); // last day of previous month
  }
  const y = biz.getFullYear();
  const m = String(biz.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const getBusinessDayStart = (date = new Date()) => {
  const CUTOFF_MS = new Date('2026-07-02T17:00:00').getTime(); // July 2 5 PM local
  if (date.getTime() < CUTOFF_MS) {
    // Before July 2nd 5 PM PKT, "Today" (July 1st business day) starts at July 1st 00:00 AM local
    return new Date('2026-07-01T00:00:00');
  }
  const BUSINESS_START_HOUR = 17; // 5 PM local
  const d = new Date(date);
  d.setHours(BUSINESS_START_HOUR, 0, 0, 0);
  if (date.getHours() < BUSINESS_START_HOUR) {
    // Before 5 PM → business day started yesterday at 5 PM
    d.setDate(d.getDate() - 1);
  }
  return d;
};

// ─── BUSINESS DAY CUTOFF ───────────────────────────────────────────────────
// Records BEFORE July 2, 2026 → old midnight-to-midnight filtering (unchanged)
// Records from July 2, 2026 onwards → new 5 PM-to-5 PM business day logic
const CUTOFF_DATE_STR = '2026-07-02'; // first date using new business day

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, 7days, 30days, custom
  const [customDateType, setCustomDateType] = useState('day'); // day, week, month, range
  const [customSingleDate, setCustomSingleDate] = useState(getBusinessDateStr);
  const [customWeekStart, setCustomWeekStart] = useState(getBusinessDateStr);
  const [customMonth, setCustomMonth] = useState(getBusinessMonthStr);
  const [customRangeStart, setCustomRangeStart] = useState(getBusinessDateStr);
  const [customRangeEnd, setCustomRangeEnd] = useState(getBusinessDateStr);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    dateFilter,
    customDateType,
    customSingleDate,
    customWeekStart,
    customMonth,
    customRangeStart,
    customRangeEnd
  ]);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await axios.get(`http://${(window.location.hostname || 'localhost')}:5000/api/expenses`);
      setExpenses(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editingExpense) {
        await axios.put(`http://${(window.location.hostname || 'localhost')}:5000/api/expenses/${editingExpense._id}`, data);
      } else {
        await axios.post(`http://${(window.location.hostname || 'localhost')}:5000/api/expenses`, data);
      }
      setShowModal(false);
      setEditingExpense(null);
      fetchExpenses();
    } catch (err) {
      console.error(err);
      alert('Error saving expense');
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`http://${(window.location.hostname || 'localhost')}:5000/api/expenses/${deleteId}`);
      setShowDeleteConfirm(false);
      fetchExpenses();
    } catch (err) {
      console.error(err);
      alert('Error deleting expense');
    }
  };

  // Filter logic
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const bizDayStart = getBusinessDayStart(now);
    const todayStart  = bizDayStart.getTime();

    return expenses.filter(expense => {
      // 1. Search filter
      const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            expense.amount.toString().includes(searchTerm);
      if (!matchesSearch) return false;

      // 2. Date filter
      const expenseDate = new Date(expense.createdAt);
      const expenseTime = expenseDate.getTime();

      if (dateFilter === 'today') {
        return expenseTime >= todayStart;

      } else if (dateFilter === '7days') {
        const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
        return expenseTime >= sevenDaysAgo;

      } else if (dateFilter === '30days') {
        const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;
        return expenseTime >= thirtyDaysAgo;

      } else if (dateFilter === 'custom') {
        if (customDateType === 'day' && customSingleDate) {
          const [y, mo, d] = customSingleDate.split('-').map(Number);
          if (customSingleDate < CUTOFF_DATE_STR) {
            const dayStart = new Date(y, mo - 1, d,  0,  0,  0,   0);
            const dayEnd   = new Date(y, mo - 1, d, 23, 59, 59, 999);
            return expenseTime >= dayStart.getTime() && expenseTime <= dayEnd.getTime();
          } else {
            const bizStart = new Date(y, mo - 1, d,     17,  0,  0,   0);
            const bizEnd   = new Date(y, mo - 1, d + 1, 16, 59, 59, 999);
            return expenseTime >= bizStart.getTime() && expenseTime <= bizEnd.getTime();
          }

        } else if (customDateType === 'week' && customWeekStart) {
          const [y, mo, d] = customWeekStart.split('-').map(Number);
          if (customWeekStart < CUTOFF_DATE_STR) {
            const start = new Date(y, mo - 1, d,  0,  0,  0,   0);
            const end   = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
            return expenseTime >= start.getTime() && expenseTime <= end.getTime();
          } else {
            const start = new Date(y, mo - 1, d, 17,  0,  0,   0);
            const end   = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
            return expenseTime >= start.getTime() && expenseTime <= end.getTime();
          }

        } else if (customDateType === 'month' && customMonth) {
          const [y, mo] = customMonth.split('-').map(Number);
          const monthStr = customMonth + '-01';
          if (monthStr < CUTOFF_DATE_STR) {
            const start = new Date(y, mo - 1,  1,  0,  0,  0,   0);
            const end   = new Date(y, mo,       0, 23, 59, 59, 999);
            return expenseTime >= start.getTime() && expenseTime <= end.getTime();
          } else {
            const start = new Date(y, mo - 1,  1, 17,  0,  0,   0);
            const end   = new Date(y, mo,       1, 16, 59, 59, 999);
            return expenseTime >= start.getTime() && expenseTime <= end.getTime();
          }

        } else if (customDateType === 'range') {
          let startValid = true;
          let endValid   = true;
          if (customRangeStart) {
            const [y, mo, d] = customRangeStart.split('-').map(Number);
            const start = customRangeStart < CUTOFF_DATE_STR
              ? new Date(y, mo - 1, d,  0,  0,  0,   0)
              : new Date(y, mo - 1, d, 17,  0,  0,   0);
            startValid = expenseTime >= start.getTime();
          }
          if (customRangeEnd) {
            const [y, mo, d] = customRangeEnd.split('-').map(Number);
            const end = customRangeEnd < CUTOFF_DATE_STR
              ? new Date(y, mo - 1, d,     23, 59, 59, 999)
              : new Date(y, mo - 1, d + 1, 16, 59, 59, 999);
            endValid = expenseTime <= end.getTime();
          }
          return startValid && endValid;
        }
      }

      return true; // 'all' filter
    });
  }, [expenses, searchTerm, dateFilter, customDateType, customSingleDate, customWeekStart, customMonth, customRangeStart, customRangeEnd]);

  // Calculate metrics
  const { totalExpenseAmount, totalExpenseCount, averageExpenseAmount } = useMemo(() => {
    const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const count = filteredExpenses.length;
    const avg = count > 0 ? (total / count) : 0;
    return {
      totalExpenseAmount: total,
      totalExpenseCount: count,
      averageExpenseAmount: avg
    };
  }, [filteredExpenses]);

  // Pagination
  const paginatedExpenses = useMemo(() => {
    return filteredExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredExpenses, currentPage]);
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);

  const getDynamicFontSize = (valueStr) => {
    const len = valueStr.length;
    if (len > 12) return '1rem';
    if (len > 9) return '1.15rem';
    if (len > 7) return '1.25rem';
    return '1.4rem';
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 100px)' }}>
          <Spinner size={50} color="var(--primary-yellow)" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="fade-in" style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Expenses</h1>
            <p style={{ color: 'var(--text-muted)' }}>Manage daily restaurant expenses</p>
          </div>
          <button 
            className="btn-primary" 
            style={styles.headerBtn}
            onClick={() => { setEditingExpense(null); setShowModal(true); }}
          >
            <Plus size={20} /> Add Expense
          </button>
        </div>

        {/* Compact Actions & Filters */}
        <div style={styles.filterSection} className="glass-card">
          <div style={styles.filtersRow}>
            {/* Search Input */}
            <div style={styles.inputIconContainer}>
              <Search size={16} style={styles.inputIcon} />
              <input 
                type="text" 
                placeholder="Search description or amount..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.compactInput}
              />
            </div>

            {/* Date Range Selector Presets */}
            <div style={styles.datePills}>
              {[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: '7days', label: '7 Days' },
                { value: '30days', label: '30 Days' },
                { value: 'custom', label: 'Custom' },
              ].map(preset => (
                <button
                  key={preset.value}
                  onClick={() => setDateFilter(preset.value)}
                  style={{
                    ...styles.datePill,
                    backgroundColor: dateFilter === preset.value ? 'var(--primary-yellow)' : 'rgba(255, 255, 255, 0.03)',
                    color: dateFilter === preset.value ? '#000000' : 'var(--text-muted)',
                    borderColor: dateFilter === preset.value ? 'var(--primary-yellow)' : 'var(--glass-border)'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button onClick={fetchExpenses} style={styles.refreshBtn}>
              <RefreshCw size={16} />
            </button>
          </div>

          {dateFilter === 'custom' && (
            <div style={styles.customFilterRow}>
              {/* Custom Type Selector */}
              <div style={styles.customTypePills}>
                {[
                  { value: 'day', label: 'Single Day' },
                  { value: 'week', label: 'Specific Week' },
                  { value: 'month', label: 'Specific Month' },
                  { value: 'range', label: 'Custom Range' }
                ].map(type => (
                  <button
                    key={type.value}
                    onClick={() => setCustomDateType(type.value)}
                    style={{
                      ...styles.customTypePill,
                      backgroundColor: customDateType === type.value ? 'var(--primary-yellow)' : 'rgba(255, 255, 255, 0.03)',
                      color: customDateType === type.value ? '#000000' : 'var(--text-muted)',
                      borderColor: customDateType === type.value ? 'var(--primary-yellow)' : 'var(--glass-border)'
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              {/* Input Selectors */}
              <div style={styles.customInputsContainer}>
                {customDateType === 'day' && (
                  <div style={styles.inputWithLabel}>
                    <span style={styles.inputLabel}>Select Day:</span>
                    <input 
                      type="date" 
                      value={customSingleDate} 
                      onChange={(e) => setCustomSingleDate(e.target.value)} 
                      style={styles.datePickerInput}
                    />
                  </div>
                )}
                {customDateType === 'week' && (
                  <div style={styles.inputWithLabel}>
                    <span style={styles.inputLabel}>Week Starting:</span>
                    <input 
                      type="date" 
                      value={customWeekStart} 
                      onChange={(e) => setCustomWeekStart(e.target.value)} 
                      style={styles.datePickerInput}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>(Fetches 7 days)</span>
                  </div>
                )}
                {customDateType === 'month' && (
                  <div style={styles.inputWithLabel}>
                    <span style={styles.inputLabel}>Select Month:</span>
                    <input 
                      type="month" 
                      value={customMonth} 
                      onChange={(e) => setCustomMonth(e.target.value)} 
                      style={styles.datePickerInput}
                    />
                  </div>
                )}
                {customDateType === 'range' && (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={styles.inputWithLabel}>
                      <span style={styles.inputLabel}>From:</span>
                      <input 
                        type="date" 
                        value={customRangeStart} 
                        onChange={(e) => setCustomRangeStart(e.target.value)} 
                        style={styles.datePickerInput}
                      />
                    </div>
                    <div style={styles.inputWithLabel}>
                      <span style={styles.inputLabel}>To:</span>
                      <input 
                        type="date" 
                        value={customRangeEnd} 
                        onChange={(e) => setCustomRangeEnd(e.target.value)} 
                        style={styles.datePickerInput}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Metrics Row */}
        <div style={styles.metricsGrid}>
          <div className="glass-card" style={styles.metricCard}>
            <div style={{ ...styles.iconContainer, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <p style={styles.metricTitle}>Total Expenses</p>
              <h2 style={{ ...styles.metricValue, fontSize: getDynamicFontSize(`Rs. ${totalExpenseAmount.toLocaleString()}`) }}>
                Rs. {totalExpenseAmount.toLocaleString()}
              </h2>
            </div>
          </div>

          <div className="glass-card" style={styles.metricCard}>
            <div style={{ ...styles.iconContainer, backgroundColor: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa' }}>
              <FileText size={20} />
            </div>
            <div>
              <p style={styles.metricTitle}>Total Count</p>
              <h2 style={{ ...styles.metricValue, fontSize: getDynamicFontSize(`${totalExpenseCount}`) }}>
                {totalExpenseCount}
              </h2>
            </div>
          </div>

          <div className="glass-card" style={styles.metricCard}>
            <div style={{ ...styles.iconContainer, backgroundColor: 'rgba(250, 204, 21, 0.1)', color: 'var(--primary-yellow)' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <p style={styles.metricTitle}>Avg. Expense</p>
              <h2 style={{ ...styles.metricValue, fontSize: getDynamicFontSize(`Rs. ${Math.round(averageExpenseAmount).toLocaleString()}`) }}>
                Rs. {Math.round(averageExpenseAmount).toLocaleString()}
              </h2>
            </div>
          </div>
        </div>

        <div className="glass-card" style={styles.card}>
          {expenses.length === 0 ? (
            <div style={styles.emptyState}>
              <FileText size={48} style={{ opacity: 0.3, color: 'var(--text-muted)' }} />
              <p>No expenses recorded yet.</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div style={styles.emptyState}>
              <FileText size={48} style={{ opacity: 0.3, color: 'var(--text-muted)' }} />
              <p>No expenses match your filters.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedExpenses.map(expense => (
                    <tr key={expense._id}>
                      <td>{formatDate(expense.createdAt)}</td>
                      <td>
                        <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{expense.description}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-red)' }}>
                        Rs. {expense.amount.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            className="icon-btn edit-btn" 
                            onClick={() => { setEditingExpense(expense); setShowModal(true); }}
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="icon-btn delete-btn" 
                            onClick={() => handleDeleteClick(expense._id)}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div style={styles.pagination}>
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => p - 1)} 
                    style={{ ...styles.pageBtn, opacity: currentPage === 1 ? 0.5 : 1 }}
                  >
                    Previous
                  </button>
                  <span style={styles.pageInfo}>Page {currentPage} of {totalPages}</span>
                  <button 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(p => p + 1)} 
                    style={{ ...styles.pageBtn, opacity: currentPage === totalPages ? 0.5 : 1 }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ExpenseFormModal 
          onClose={() => setShowModal(false)} 
          onSave={handleSave} 
          initialData={editingExpense} 
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Delete Expense"
          message="Are you sure you want to delete this expense? This action cannot be undone."
          onConfirm={confirmDelete}
          onClose={() => setShowDeleteConfirm(false)}
          confirmText="Delete"
          type="danger"
        />
      )}
    </Layout>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  headerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.8rem 1.5rem',
    fontSize: '1rem',
  },
  filterSection: {
    padding: '0.75rem 1rem',
  },
  filtersRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  inputIconContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    minWidth: '200px',
  },
  inputIcon: {
    position: 'absolute',
    left: '0.75rem',
    color: 'var(--text-muted)',
  },
  compactInput: {
    width: '100%',
    padding: '0.5rem 1rem 0.5rem 2.25rem',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'var(--glass)',
    color: 'var(--text-main)',
    fontSize: '0.85rem',
    outline: 'none',
  },
  datePills: {
    display: 'flex',
    gap: '0.4rem',
    flexWrap: 'wrap',
  },
  datePill: {
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  customFilterRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--glass-border)',
  },
  customTypePills: {
    display: 'flex',
    gap: '0.4rem',
    flexWrap: 'wrap',
  },
  customTypePill: {
    padding: '0.4rem 0.6rem',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  customInputsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  inputWithLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  inputLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  datePickerInput: {
    padding: '0.4rem 0.6rem',
    borderRadius: '6px',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'var(--glass)',
    color: 'var(--text-main)',
    fontSize: '0.8rem',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  metricCard: {
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  iconContainer: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTitle: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
    marginBottom: '0.1rem',
  },
  metricValue: {
    fontWeight: '800',
    color: 'var(--text-main)',
    margin: 0,
  },
  card: {
    padding: '1.5rem',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    color: 'var(--text-muted)',
    gap: '1rem',
    opacity: 0.7,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  pageBtn: {
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    color: 'var(--text-main)',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  pageInfo: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)'
  },
  modal: {
    width: '100%',
    maxWidth: '450px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid var(--glass-border)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '0.4rem',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
  },
  inputField: {
    padding: '0.9rem',
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    color: 'var(--text-main)',
    fontSize: '1rem',
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem',
  },
  cancelBtn: {
    flex: 1,
    padding: '0.9rem',
    fontSize: '1rem',
  },
  submitBtn: {
    flex: 1,
    padding: '0.9rem',
    fontSize: '1rem',
  }
};

export default Expenses;
