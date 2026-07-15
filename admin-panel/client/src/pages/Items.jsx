import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import ItemCreatorModal from '../components/items/ItemCreatorModal';
import ConfirmModal from '../components/ConfirmModal';
import { Spinner } from '../components/ui/spinner-1';
import { Plus, Edit2, Trash2, X, Upload, Package, MoreVertical, PlusCircle, Search, Save, Power, Tag, Layers, Flame } from 'lucide-react';
import { useData } from '../context/DataContext';


const Items = () => {
  const { items: globalItems, categories, isDataLoading, refreshData } = useData();

  // Pagination & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const LIMIT = 20;

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(null);
  const [isEditing, setIsEditing] = useState(null);

  // Bulk Edit State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkItems, setBulkItems] = useState([]);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    itemId: null,
  });

  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSubCategory, setActiveSubCategory] = useState('All');

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, activeSubCategory, searchQuery]);

  const filteredItems = useMemo(() => {
    return globalItems.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = activeCategory === 'All' || (item.category && item.category.name === activeCategory);
      const matchSubCat = activeSubCategory === 'All' || item.subCategory === activeSubCategory;
      return matchSearch && matchCat && matchSubCat;
    });
  }, [globalItems, searchQuery, activeCategory, activeSubCategory]);

  const totalPages = Math.ceil(filteredItems.length / LIMIT) || 1;
  
  const items = useMemo(() => {
    const startIndex = (currentPage - 1) * LIMIT;
    return filteredItems.slice(startIndex, startIndex + LIMIT);
  }, [filteredItems, currentPage]);

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const formatPrice = (price) => {
    return Number(price).toLocaleString('en-PK');
  };

  const resetForm = () => {
    setShowModal(false);
    setIsEditing(null);
  };

  const handleEdit = (item) => {
    setIsEditing(item);
    setShowModal(true);
  };

  const confirmDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      itemId: id,
    });
  };

  const handleDelete = async () => {
    const id = confirmModal.itemId;
    if (!id) return;
    
    try {
      await api.delete(`/api/items/${confirmModal.itemId}`);
      refreshData();
      setConfirmModal({ isOpen: false, itemId: null });
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting item');
    }
  };

  const handleToggleAvailability = async (id) => {
    try {
      await api.put(`/api/items/${id}/toggle-availability`);
      refreshData();
    } catch (err) {
      alert('Failed to toggle status');
    }
  };

  const openBulkModal = () => {
    setBulkItems(JSON.parse(JSON.stringify(items)));
    setShowBulkModal(true);
  };

  const handleBulkChange = (id, field, value, variantIndex = null) => {
    const updated = bulkItems.map(item => {
      if(item._id === id) {
        if(variantIndex !== null) {
          const newVariants = [...item.variants];
          newVariants[variantIndex][field] = value;
          return { ...item, variants: newVariants };
        }
        return { ...item, [field]: value };
      }
      return item;
    });
    setBulkItems(updated);
  };

  const handleBulkSubmit = async () => {
    try {
      const updates = bulkItems.map(item => ({
        id: item._id,
        price: item.price,
        variants: item.variants
      }));
      await api.put('/api/items/bulk/update-prices', { updates });
      refreshData();
      setShowBulkModal(false);
      alert('Prices updated successfully!');
    } catch(err) {
      alert('Error updating prices');
    }
  };


  // Group items by subCategory
  const groupedItems = useMemo(() => {
    const groups = {};
    items.forEach(item => {
      const sub = item.subCategory && item.subCategory.trim() ? item.subCategory.trim() : 'Uncategorized';
      if (!groups[sub]) {
        groups[sub] = [];
      }
      groups[sub].push(item);
    });

    const currentCategoryObj = categories.find(cat => cat.name === activeCategory);
    const orderedSubCats = currentCategoryObj?.subCategories || [];
    const sortedGroups = {};

    orderedSubCats.forEach(sub => {
      const matchingKey = Object.keys(groups).find(k => k.toLowerCase() === sub.toLowerCase());
      if (matchingKey) {
        sortedGroups[matchingKey] = groups[matchingKey];
        delete groups[matchingKey];
      }
    });

    Object.keys(groups).forEach(key => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }, [items, activeCategory, categories]);

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
      <div style={{ display: 'grid', gridTemplateColumns: '8fr 2fr 2fr', gap: '1rem', marginBottom: '1.25rem', width: '100%' }}>
        <form onSubmit={handleSearch} style={{...styles.searchBar, width: '100%', boxSizing: 'border-box', display: 'flex'}}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search Items..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{...styles.searchInput, width: '100%'}}
          />
        </form>
        
        <button onClick={openBulkModal} className="btn-secondary" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0.5rem'}}>
          <Edit2 size={18} />
        </button>
        <button onClick={() => setShowModal(true)} className="btn-primary" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0.5rem'}}>
          <Plus size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', width: '100%', gap: '16px' }}>
        <div style={{ ...styles.tabsContainer, marginBottom: 0, flex: 1 }}>
          <button
            onClick={() => { setActiveCategory('All'); setActiveSubCategory('All'); }}
            style={{
              ...styles.tab,
              backgroundColor: activeCategory === 'All' ? 'var(--primary-yellow)' : 'var(--glass)',
              color: activeCategory === 'All' ? '#000' : 'var(--text-main)',
            }}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat._id}
              onClick={() => { setActiveCategory(cat.name); setActiveSubCategory('All'); }}
              style={{
                ...styles.tab,
                backgroundColor: activeCategory === cat.name ? 'var(--primary-yellow)' : 'var(--glass)',
                color: activeCategory === cat.name ? '#000' : 'var(--text-main)',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '155px', backgroundColor: 'var(--glass)', border: '1px solid var(--glass-border)', padding: '0.35rem 0.6rem', borderRadius: '8px', boxSizing: 'border-box', flexShrink: 0 }}>
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(currentPage - 1)}
              className="btn-secondary"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              Prev
            </button>
            <span style={{color: 'var(--text-main)', fontSize: '0.75rem', fontWeight: 'bold'}}>
              {currentPage} / {totalPages}
            </span>
            <button 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(currentPage + 1)}
              className="btn-secondary"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {activeCategory !== 'All' && (
        (() => {
          const currentCat = categories.find(cat => cat.name === activeCategory);
          const subCats = currentCat?.subCategories || [];
          if (subCats.length === 0) return null;
          return (
            <div style={styles.subTabsContainer}>
              <button
                onClick={() => setActiveSubCategory('All')}
                style={{
                  ...styles.subTab,
                  backgroundColor: activeSubCategory === 'All' ? 'var(--primary-yellow)' : 'var(--glass)',
                  color: activeSubCategory === 'All' ? '#000' : 'var(--text-main)',
                }}
              >
                All Option
              </button>
              {subCats.map((sub, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSubCategory(sub)}
                  style={{
                    ...styles.subTab,
                    backgroundColor: activeSubCategory === sub ? 'var(--primary-yellow)' : 'var(--glass)',
                    color: activeSubCategory === sub ? '#000' : 'var(--text-main)',
                  }}
                >
                  {sub.includes(' / ') ? sub.replace(' / ', ' ➔ ') : sub}
                </button>
              ))}
            </div>
          );
        })()
      )}

      <div className="items-container" style={styles.itemsContainer}>
        {Object.keys(groupedItems).length > 0 ? (
          Object.keys(groupedItems).map(subCat => {
            const groupItems = groupedItems[subCat];
            const showHeading = Object.keys(groupedItems).length > 1 || (subCat !== 'Uncategorized');

            return (
              <div key={subCat} style={styles.subCatSection}>
                {showHeading && (
                  <h4 style={styles.subCatHeading}>{subCat}</h4>
                )}
                <div style={styles.grid}>
                  {groupItems.map((item) => {
                    const isAvail = item.isAvailable !== false;
                    return (
                      <div key={item._id} className="hover-scale" style={{...styles.itemCard, opacity: isAvail ? 1 : 0.6}}>
                        <div style={styles.menuDotContainer}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDropdown(showDropdown === item._id ? null : item._id);
                            }}
                            style={styles.menuDotBtn}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {showDropdown === item._id && (
                            <div style={styles.dropdownMenu}>
                              <button onClick={(e) => { e.stopPropagation(); handleEdit(item); setShowDropdown(null); }} style={styles.dropdownItem}>
                                <Edit2 size={14} style={{ marginRight: '0.4rem' }} /> Edit
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleToggleAvailability(item._id); setShowDropdown(null); }} style={styles.dropdownItem}>
                                <Power size={14} style={{ marginRight: '0.4rem' }} /> {isAvail ? 'Out of Stock' : 'Available'}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); confirmDelete(item._id); setShowDropdown(null); }} style={{ ...styles.dropdownItem, color: 'var(--accent-red)' }}>
                                <Trash2 size={14} style={{ marginRight: '0.4rem' }} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {!isAvail && (
                          <div style={styles.outOfStockOverlay}>OUT OF STOCK</div>
                        )}

                        <div style={styles.imageContainer}>
                          {item.image ? (
                            <img src={item.image} alt={item.name} style={styles.itemImage} />
                          ) : (
                            <div style={{...styles.itemImage, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)'}}>
                              <Package size={32} color="var(--primary-yellow)" />
                            </div>
                          )}
                        </div>

                        <div style={styles.itemHeaderContainer}>
                          <div style={styles.itemName}>{item.name}</div>
                          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                            {item.spiceLevel && <span style={styles.chip}>Spicy</span>}
                            {item.addons?.length > 0 && <span style={styles.chip}>{item.addons.length} Extras</span>}
                          </div>
                        </div>

                        <div style={styles.itemPriceContainer}>
                          {item.variants && item.variants.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Portions:</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {item.variants.map((v, idx) => (
                                  <span key={idx} style={{
                                    fontSize: '0.65rem',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    color: 'var(--text-main)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {v.name}: Rs. {formatPrice(v.price)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div style={styles.itemPrice}>
                              {item.priceType === 'variants' && item.variants?.length > 0 
                                ? `From Rs. ${formatPrice(Math.min(...item.variants.map(v => Number(v.price))))}`
                                : `Rs. ${formatPrice(item.price)}`
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div style={styles.noItems}>
            <Package size={48} />
            <p>No items found.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div style={styles.paginationContainer}>
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(currentPage - 1)}
            className="btn-secondary"
          >
            Previous
          </button>
          <span style={{color: 'var(--text-main)', fontSize: '0.9rem'}}>Page {currentPage} of {totalPages}</span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(currentPage + 1)}
            className="btn-secondary"
          >
            Next
          </button>
        </div>
      )}

      {showBulkModal && (
        <div style={styles.modalOverlay}>
          <div className="modal-card" style={{...styles.modal, maxWidth: '900px'}}>
            <div style={styles.modalHeader}>
              <h3>Quick Price Update (Bulk Edit)</h3>
              <button onClick={() => setShowBulkModal(false)} style={styles.closeBtn}><X /></button>
            </div>
            <div style={{maxHeight: '60vh', overflowY: 'auto', marginBottom: '1.5rem'}}>
              <table style={{width: '100%', borderCollapse: 'collapse', color: 'var(--text-main)'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid var(--glass-border)'}}>
                    <th style={{textAlign: 'left', padding: '10px'}}>Item Name</th>
                    <th style={{textAlign: 'left', padding: '10px'}}>Category</th>
                    <th style={{textAlign: 'left', padding: '10px'}}>Price / Variants (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkItems.map(item => (
                    <tr key={item._id} style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                      <td style={{padding: '10px', fontSize: '0.9rem'}}>{item.name}</td>
                      <td style={{padding: '10px', fontSize: '0.8rem', color: 'var(--text-muted)'}}>{item.category?.name || '-'}</td>
                      <td style={{padding: '10px'}}>
                        {item.priceType === 'single' ? (
                          <input 
                            type="number" 
                            value={item.price} 
                            onChange={(e) => handleBulkChange(item._id, 'price', e.target.value)}
                            style={{...styles.bulkInput, width: '120px'}}
                          />
                        ) : (
                          <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                            {item.variants.map((v, i) => (
                              <div key={i} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <span style={{fontSize: '0.8rem', width: '60px'}}>{v.name}</span>
                                <input 
                                  type="number"
                                  value={v.price}
                                  onChange={(e) => handleBulkChange(item._id, 'price', e.target.value, i)}
                                  style={{...styles.bulkInput, width: '100px'}}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
              <button onClick={() => setShowBulkModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleBulkSubmit} className="btn-primary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <Save size={18} /> Save All Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <ItemCreatorModal 
        isOpen={showModal} 
        onClose={resetForm} 
        itemToEdit={isEditing} 
        categories={categories} 
        refreshData={refreshData} 
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, itemId: null })}
        onConfirm={handleDelete}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
      />
    </Layout>
  );
};

const styles = {
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
    gap: '1rem'
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
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '0.4rem 0.8rem',
    gap: '0.5rem',
  },
  searchInput: {
    background: 'none',
    border: 'none',
    color: 'var(--text-main)',
    outline: 'none',
    width: '200px',
    fontSize: '0.9rem'
  },
  tabsContainer: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
    overflowX: 'auto',
    paddingBottom: '0.5rem',
  },
  tab: {
    padding: '0.45rem 1rem',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    border: '1px solid var(--glass-border)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  subTab: {
    padding: '0.3rem 0.6rem',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '0.72rem',
    whiteSpace: 'nowrap',
    border: '1px solid var(--glass-border)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  subTabsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem',
    marginBottom: '1.5rem',
    width: '100%',
  },
  itemsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2.5rem',
    minHeight: '65vh',
  },
  subCatSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  subCatHeading: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: 'var(--text-muted)',
    borderBottom: '2px solid var(--glass-border)',
    paddingBottom: '0.4rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '1.5rem',
  },
  itemCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-15deg)',
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    color: '#fff',
    padding: '0.5rem 1rem',
    fontWeight: '900',
    fontSize: '1.2rem',
    borderRadius: '8px',
    zIndex: 5,
    border: '2px solid #fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
    whiteSpace: 'nowrap'
  },
  menuDotContainer: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    zIndex: 10,
  },
  menuDotBtn: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid black',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-main)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '2.2rem',
    right: '0',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    width: '140px',
    zIndex: 20,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: '0.6rem 0.8rem',
    display: 'flex',
    alignItems: 'center',
    color: 'var(--text-main)',
    fontSize: '0.8rem',
    fontWeight: '600',
    borderBottom: '1px solid var(--glass-border)',
    background: 'none',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
  },
  imageContainer: {
    aspectRatio: '16/9',
    width: '100%',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '1rem',
    backgroundColor: '#e5e7eb',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--glass)',
  },
  itemHeaderContainer: {
    marginBottom: '1rem',
    width: '100%',
  },
  itemName: {
    color: 'var(--text-main)',
    fontWeight: '600',
    fontSize: '1rem',
    letterSpacing: '-0.5px',
    lineHeight: '1.2',
    wordBreak: 'break-word',
  },
  itemPriceContainer: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    marginTop: 'auto',
    paddingTop: '1rem',
    borderTop: '1px solid var(--glass-border)',
  },
  itemPrice: {
    color: 'var(--primary-yellow)',
    fontWeight: '800',
    fontSize: '1.25rem',
  },
  noItems: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5rem',
    color: 'var(--text-muted)',
    gap: '1rem',
  },
  chip: {
    padding: '2px 8px',
    backgroundColor: 'var(--glass-border)',
    borderRadius: '12px',
    fontSize: '0.7rem'
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '2rem',
    gap: '1.5rem'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '95%',
    maxWidth: '800px',
    padding: '2rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '20px',
    border: '1px solid var(--glass-border)',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
    color: 'var(--text-main)',
  },
  formSectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--glass-border)',
    borderRadius: '16px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '1rem',
    marginBottom: '0.5rem'
  },
  sectionNumber: {
    backgroundColor: 'var(--primary-yellow)',
    color: '#000',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '900',
    fontSize: '0.9rem'
  },
  sectionTitleText: {
    color: 'var(--text-main)',
    fontSize: '1.1rem',
    margin: 0,
    fontWeight: '700'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '2rem',
  },
  formLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  formRight: {
    display: 'flex',
    flexDirection: 'column',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    fontWeight: '600'
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: 'var(--text-main)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
    boxSizing: 'border-box'
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    cursor: 'pointer',
  },
  toggleSwitch: {
    width: '44px',
    height: '24px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '12px',
    position: 'relative',
    transition: 'background-color 0.3s ease',
  },
  toggleSwitchActive: {
    backgroundColor: 'var(--primary-yellow)',
  },
  toggleThumb: {
    width: '20px',
    height: '20px',
    backgroundColor: '#fff',
    borderRadius: '50%',
    position: 'absolute',
    top: '2px',
    left: '2px',
    transition: 'transform 0.3s ease',
  },
  toggleThumbActive: {
    transform: 'translateX(20px)',
  },
  priceTypeContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  priceTypeCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    padding: '1rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  priceTypeCardActive: {
    backgroundColor: 'rgba(var(--primary-yellow-rgb, 250, 204, 21), 0.1)',
    borderColor: 'var(--primary-yellow)',
  },
  priceTypeIconWrapper: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: '0.5rem',
    borderRadius: '8px',
    color: 'var(--text-muted)'
  },
  iconActive: {
    color: 'var(--primary-yellow)',
    backgroundColor: 'rgba(var(--primary-yellow-rgb, 250, 204, 21), 0.2)',
  },
  priceTypeText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem'
  },
  priceTypeTitle: {
    color: 'var(--text-main)',
    fontWeight: '600',
    fontSize: '0.95rem'
  },
  priceTypeSub: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem'
  },
  priceInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%'
  },
  currencyPrefix: {
    position: 'absolute',
    left: '1rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
    fontSize: '0.95rem',
    pointerEvents: 'none'
  },
  variantsContainer: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '1.25rem',
    marginTop: '1rem'
  },
  spiceLevelCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
    border: '1px solid rgba(255, 59, 48, 0.2)',
    borderRadius: '12px',
    padding: '1.25rem',
    transition: 'all 0.3s ease'
  },
  spiceLevelCardActive: {
    backgroundColor: 'var(--accent-red)',
    borderColor: 'var(--accent-red)',
  },
  spiceLevelInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  spiceLevelIconWrapper: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '0.6rem',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  previewContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  changeImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    padding: '0.5rem',
    textAlign: 'center',
    fontSize: '0.85rem',
    fontWeight: '600'
  },
  uploadPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  uploadIconWrapper: {
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    padding: '1rem',
    borderRadius: '50%',
    marginBottom: '0.5rem'
  },
  uploadTextMain: {
    color: 'var(--text-main)',
    fontWeight: '600',
    fontSize: '0.95rem'
  },
  uploadTextSub: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '0.5rem',
    borderTop: '1px solid var(--glass-border)',
    paddingTop: '1.5rem'
  },
  dynamicRow: {
    display: 'flex',
    gap: '0.8rem',
    alignItems: 'center',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-red)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: '4px'
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'none',
    border: '1px dashed var(--glass-border)',
    color: 'var(--text-main)',
    padding: '0.6rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '1rem',
    width: 'fit-content',
    fontSize: '0.85rem'
  },
  bulkInput: {
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-main)',
    padding: '0.3rem 0.5rem',
    borderRadius: '4px',
    outline: 'none'
  },
  uploadArea: {
    flex: 1,
    border: '2px dashed var(--glass-border)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'border-color 0.3s ease',
    gap: '0.4rem',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    minHeight: '220px',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  previewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  closeBtn: { color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }
};

export default Items;
