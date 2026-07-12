import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Spinner } from '../components/ui/spinner-1';
import { Package, Tags, Gift, Activity, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { getApiUrl } from '../utils/api';

const Dashboard = () => {
  const { items, categories, deals, ingredients, isDataLoading } = useData();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [businessSummary, setBusinessSummary] = useState({
    totalSales: 0,
    totalExpenses: 0,
    netCash: 0
  });
  const [recentSales, setRecentSales] = useState([]);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, salesRes] = await Promise.all([
        axios.get(getApiUrl('/api/dashboard/today')),
        axios.get(getApiUrl('/api/sales'))
      ]);
      const summary = summaryRes.data || { totalSales: 0, totalExpenses: 0, netCash: 0 };
      setBusinessSummary(summary);
      const sales = Array.isArray(salesRes.data) ? salesRes.data.slice(0, 5) : [];
      setRecentSales(sales);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setLoading(false);
    }
  };

  const statsData = {
    items: items.length,
    categories: categories.length,
    deals: deals.length,
  };

  const recentItems = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  const handleAddExpense = async () => {
    if (!expenseAmount || !expenseDesc) {
      alert("Please enter both amount and description.");
      return;
    }

    try {
      await axios.post(getApiUrl('/api/expenses'), {
        amount: expenseAmount,
        description: expenseDesc
      });

      // Refresh Data
      fetchDashboardData();

      // Close and clear
      setShowExpenseModal(false);
      setExpenseAmount('');
      setExpenseDesc('');

    } catch (err) {
      alert("Failed to add expense: " + err.message);
    }
  };

  const stats = [
    { title: 'Total Items', value: statsData.items, icon: <Package />, color: 'var(--primary-yellow)', path: '/items' },
    { title: 'Total Categories', value: statsData.categories, icon: <Tags />, color: '#60a5fa', path: '/categories' },
    { title: 'Total Deals', value: statsData.deals, icon: <Gift />, color: 'var(--accent-red)', path: '/deals' },
  ];

  if (loading || isDataLoading) return <Layout><div style={{display: 'flex', justifyContent: 'center', padding: '2rem'}}><Spinner /></div></Layout>;

  return (
    <Layout>
        <>
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--primary-yellow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--text-main)' }}>
                Today's Business
              </h2>
              <button
                onClick={() => setShowExpenseModal(true)}
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                Add Expense (Rozana Kharcha)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'rgba(74, 222, 128, 0.05)', borderRadius: '8px', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Sales</p>
                <h3 style={{ margin: '0.5rem 0 0 0', color: '#4ade80', fontSize: '1.5rem' }}>Rs. {businessSummary.totalSales.toLocaleString()}</h3>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Expenses</p>
                <h3 style={{ margin: '0.5rem 0 0 0', color: '#ef4444', fontSize: '1.5rem' }}>Rs. {businessSummary.totalExpenses.toLocaleString()}</h3>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'rgba(250, 204, 21, 0.1)', borderRadius: '8px', border: '1px solid rgba(250, 204, 21, 0.3)' }}>
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem', fontWeight: 'bold' }}>Net Cash in Drawer</p>
                <h3 style={{ margin: '0.5rem 0 0 0', color: 'var(--primary-yellow)', fontSize: '1.8rem', fontWeight: '800' }}>Rs. {businessSummary.netCash.toLocaleString()}</h3>
              </div>
            </div>
          </div>

          <div style={styles.grid}>
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="glass-card" 
                style={{ ...styles.statCard, cursor: 'pointer' }}
                onClick={() => navigate(stat.path)}
              >
                <div style={{ ...styles.iconWrapper, backgroundColor: `${stat.color}20`, color: stat.color }}>
                  {stat.icon}
                </div>
                <div style={styles.statInfo}>
                  <p style={styles.statTitle}>{stat.title}</p>
                  <h3 style={styles.statValue}>{stat.value}</h3>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Activity color="var(--primary-yellow)" />
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0 }}>Recent Order Sales</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tr}>
                    <th style={styles.th}>DATE & TIME</th>
                    <th style={styles.th}>ORDER TYPE</th>
                    <th style={styles.th}>CUSTOMER</th>
                    <th style={styles.th}>ITEMS</th>
                    <th style={styles.th}>TOTAL ITEMS</th>
                    <th style={styles.th}>GRAND TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.length > 0 ? (
                    recentSales.map((sale) => {
                      const date = new Date(sale.createdAt);
                      const formattedDate = date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      });
                      const formattedTime = date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      return (
                        <tr 
                          key={sale._id} 
                          style={{ ...styles.tr, cursor: 'pointer' }}
                          onClick={() => navigate('/sales')}
                        >
                          <td style={styles.td}>
                            <div style={{ fontWeight: '700' }}>{formattedDate}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formattedTime}</div>
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              backgroundColor: sale.orderType === 'Dine-in' ? 'rgba(74, 222, 128, 0.1)' : 
                                              sale.orderType === 'Delivery' ? 'rgba(96, 165, 250, 0.1)' : 
                                              'rgba(250, 204, 21, 0.1)',
                              color: sale.orderType === 'Dine-in' ? '#4ade80' : 
                                    sale.orderType === 'Delivery' ? '#60a5fa' : 
                                    'var(--primary-yellow)',
                              display: 'inline-block'
                            }}>
                              {sale.orderType || 'Takeaway'}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {sale.orderType === 'Delivery' && (sale.customerName || sale.customerPhone) ? (
                              <div style={{ fontSize: '0.8rem' }}>
                                <div>{sale.customerName}</div>
                                <div style={{ color: 'var(--text-muted)' }}>{sale.customerPhone}</div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                          <td style={{ ...styles.td, fontSize: '0.8rem', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}>
                            {sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                          </td>
                          <td style={styles.td}>
                            {sale.items.reduce((sum, i) => sum + i.quantity, 0)}
                          </td>
                          <td style={{ ...styles.td, fontWeight: '800', color: 'var(--primary-yellow)' }}>
                            Rs. {sale.totalAmount.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr style={styles.tr}>
                      <td colSpan="6" style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No recent sales found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={styles.chartsRow}>
            <div className="glass-card" style={styles.mainCharCard}>
              <div style={styles.headerFlex}>
                <Package color="var(--primary-yellow)" />
                <h3 style={styles.cardTitle}>Recent Products</h3>
              </div>

              <div style={styles.placeholderChart}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tr}>
                        <th style={styles.th}>IMAGE</th>
                        <th style={styles.th}>NAME</th>
                        <th style={styles.th}>PRICE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentItems.length > 0 ? (
                        recentItems.slice(0, 5).map((item) => (
                          <tr key={item._id} style={styles.tr}>
                            <td style={styles.td}>
                              {item.image ? (
                                <img src={item.image} alt={item.name} style={{ width: '35px', height: '35px', borderRadius: '6px', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '35px', height: '35px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                  <Package size={16} color="var(--primary-yellow)" />
                                </div>
                              )}
                            </td>
                            <td style={styles.td}>{item.name}</td>
                            <td style={styles.td}>Rs. {item.price}</td>
                          </tr>
                        ))
                      ) : (
                        <tr style={styles.tr}>
                          <td colSpan="3" style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No recent items found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="glass-card" style={styles.alertCard}>
              <div style={styles.headerFlex}>
                <AlertTriangle color="var(--accent-red)" />
                <h3 style={styles.cardTitle}>Low Stock Warnings</h3>
              </div>
              <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {ingredients.filter(ing => (ing.stockQuantity ?? 0) <= (ing.lowStockThreshold ?? 0)).length === 0 && 
                 items.filter(item => item.trackDirectStock && (item.stockQuantity ?? 0) <= (item.lowStockThreshold ?? 0)).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>All materials and items are fully stocked.</p>
                ) : (
                  <>
                    {ingredients.filter(ing => (ing.stockQuantity ?? 0) <= (ing.lowStockThreshold ?? 0)).map(ing => (
                      <div key={ing._id} style={styles.alertRow}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{ing.name} (Material)</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Threshold: {ing.lowStockThreshold ?? 0} {ing.unit}</span>
                        </div>
                        <span style={{ color: 'var(--accent-red)', fontWeight: '700', fontSize: '0.9rem' }}>{Number(ing.stockQuantity ?? 0).toFixed(1)} {ing.unit}</span>
                      </div>
                    ))}
                    {items.filter(item => item.trackDirectStock && (item.stockQuantity ?? 0) <= (item.lowStockThreshold ?? 0)).map(item => (
                      <div key={item._id} style={styles.alertRow}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.name} (Product)</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Threshold: {item.lowStockThreshold ?? 0} pcs</span>
                        </div>
                        <span style={{ color: 'var(--accent-red)', fontWeight: '700', fontSize: '0.9rem' }}>{item.stockQuantity ?? 0} pcs</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Add Expense Modal */}
          {showExpenseModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="modal-card" style={{ width: '400px', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ color: 'var(--text-main)', fontSize: '1.3rem', margin: 0 }}>Add Daily Expense</h2>
                </div>

                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Amount (Rs.)</label>
                  <input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="e.g. 200"
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg)', color: 'var(--text-main)', fontSize: '1rem' }}
                    autoFocus
                  />
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Description</label>
                  <input
                    type="text"
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    placeholder="e.g. Ice, Sabzi, Rider Pay"
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg)', color: 'var(--text-main)', fontSize: '1rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={() => setShowExpenseModal(false)} style={{ flex: 1, padding: '0.8rem', backgroundColor: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                  <button onClick={handleAddExpense} style={{ flex: 2, padding: '0.8rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Save Expense</button>
                </div>
              </div>
            </div>
          )}
        </>
    </Layout>
  );
};

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  statCard: {
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  statTitle: {
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    marginBottom: '0.25rem',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  chartsRow: {
    marginTop: '2rem',
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  mainCharCard: {
    padding: '2rem',
    flex: 3,
    minWidth: '350px',
  },
  alertCard: {
    padding: '2rem',
    flex: 2,
    minWidth: '280px',
  },
  alertRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: '10px',
    border: '1px solid rgba(239, 68, 68, 0.15)',
  },
  headerFlex: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  cardTitle: {
    fontSize: '1.25rem',
    color: 'var(--text-main)',
    margin: 0,
  },
  placeholderChart: {
    width: '100%',
    minHeight: '200px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid var(--glass-border)',
    color: 'var(--text-muted)',
    fontSize: '0.825rem',
    fontWeight: '600',
  },
  tr: {
    borderBottom: '1px solid var(--glass-border)',
  },
  td: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.825rem',
    color: 'var(--text-main)',
    verticalAlign: 'middle',
  },
  statusBadge: {
    padding: '0.35rem 0.85rem',
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-main)',
    borderRadius: '50px',
    fontSize: '0.75rem',
    fontWeight: '600',
  }
};

export default Dashboard;
