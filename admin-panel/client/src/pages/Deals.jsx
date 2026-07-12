import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import ConfirmModal from '../components/ConfirmModal';
import { Spinner } from '../components/ui/spinner-1';
import { 
  Plus, 
  Trash2, 
  Tag, 
  Edit2,
  MoreVertical,
  X,
  Eye
} from 'lucide-react';
import DealCreator from '../components/deals/DealCreator';
import DealViewerModal from '../components/deals/DealViewerModal';
import { useData } from '../context/DataContext';

const Deals = () => {
  const { deals, items, categories, isDataLoading, refreshData } = useData();
  const [isCreating, setIsCreating] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, dealId: null });
  const [viewingDeal, setViewingDeal] = useState(null);
  const [isViewingModalOpen, setIsViewingModalOpen] = useState(false);

  useEffect(() => {
    const closeMenus = () => setActiveMenuId(null);
    document.addEventListener('click', closeMenus);
    return () => document.removeEventListener('click', closeMenus);
  }, []);

  const toggleMenu = (dealId, e) => {
    e.stopPropagation();
    setActiveMenuId(prev => (prev === dealId ? null : dealId));
  };

  const handleCreateNew = () => {
    setEditingDeal(null);
    setIsCreating(true);
  };

  const handleEdit = (deal) => {
    setEditingDeal(deal);
    setIsCreating(true);
  };

  const handleView = (deal) => {
    setViewingDeal(deal);
    setIsViewingModalOpen(true);
    setActiveMenuId(null);
  };

  const confirmDelete = (id) => {
    setConfirmModal({ isOpen: true, dealId: id });
    setActiveMenuId(null);
  };

  const handleDelete = async () => {
    const id = confirmModal.dealId;
    if (!id) return;
    try {
      await axios.delete(`http://${(window.location.hostname || 'localhost')}:5000/api/deals/${id}`);
      refreshData();
      setConfirmModal({ isOpen: false, dealId: null });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDealSaved = (savedDeal, isEdit) => {
    refreshData();
    setIsCreating(false);
  };

  if (isDataLoading) return <Layout><div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', width: '100%' }}><Spinner size={40} color="var(--primary-yellow)" /></div></Layout>;

  return (
    <Layout>
      {!isCreating && (
        <div style={styles.header}>
          <div style={styles.headerInfo}>
            <Tag size={20} style={{ color: 'var(--primary-yellow)' }} />
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800' }}>Deals Management</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Create and manage combo offers</p>
            </div>
          </div>
          <button onClick={handleCreateNew} className="btn-primary" style={styles.createBtn}>
            <Plus size={20} /> New Deal
          </button>
        </div>
      )}

      {!isCreating ? (
        <div className="items-grid" style={styles.dealsGrid}>
          {deals.length > 0 ? (
            deals.map(deal => (
              <div key={deal._id} className="glass-card" style={styles.menuDealCard}>
                {/* 3-Dot Actions Menu */}
                <div style={styles.menuDotContainer}>
                  <button 
                    onClick={(e) => toggleMenu(deal._id, e)} 
                    style={styles.menuDotBtn}
                    className="hover-scale"
                  >
                    <MoreVertical size={18} style={{ color: 'var(--text-main)' }} />
                  </button>
                  
                  {activeMenuId === deal._id && (
                    <div style={styles.dropdownMenu}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleView(deal); }} 
                        style={styles.dropdownItem}
                      >
                        <Eye size={13} style={{ marginRight: '0.4rem' }} /> View
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(deal); }} 
                        style={styles.dropdownItem}
                      >
                        <Edit2 size={13} style={{ marginRight: '0.4rem' }} /> Edit
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); confirmDelete(deal._id); }} 
                        style={{ ...styles.dropdownItem, borderBottom: 'none', color: 'var(--accent-red)' }}
                      >
                        <Trash2 size={13} style={{ marginRight: '0.4rem' }} /> Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Header: Deal Name inside white paintbrush-like banner */}
                <div style={styles.menuDealHeaderContainer}>
                  <div style={styles.menuDealHeaderPatch}>
                    {deal.name}
                  </div>
                </div>

                {/* Content Area: Items list */}
                <div style={styles.menuDealItemsArea}>
                  {deal.items.map((di, idx) => (
                    <div key={idx} style={styles.menuDealItemRow} title={`${di.quantity}x ${di.item?.name || 'Deleted Item'}`}>
                      • {di.quantity}x {di.item?.name || 'Deleted Item'}
                    </div>
                  ))}
                </div>

                {/* Image Container */}
                <div style={styles.menuDealImageContainer}>
                  {deal.image ? (
                    <img src={deal.image} alt={deal.name} style={styles.menuDealImage} />
                  ) : (
                    <div style={{...styles.menuDealImage, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)'}}>
                      <Tag size={32} color="var(--primary-yellow)" />
                    </div>
                  )}
                </div>

                {/* Price: Dark Red banner patch */}
                <div style={styles.menuDealPriceContainer}>
                  <div style={styles.menuDealPricePatch}>
                    Rs {deal.price}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={styles.emptyState}>
              <Tag size={64} style={{ opacity: 0.1, marginBottom: '1rem' }} />
              <h3>No Deals Created Yet</h3>
              <p>Click the button above to create your first combo deal</p>
            </div>
          )}
        </div>
      ) : (
        <DealCreator 
          items={items}
          categories={categories}
          initialData={editingDeal}
          onSave={handleDealSaved}
          onCancel={() => setIsCreating(false)}
        />
      )}

      <DealViewerModal 
        isOpen={isViewingModalOpen} 
        onClose={() => setIsViewingModalOpen(false)} 
        deal={viewingDeal} 
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, dealId: null })}
        onConfirm={handleDelete}
        title="Delete Deal"
        message="Are you sure you want to delete this deal? This action cannot be undone."
      />
    </Layout>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  createBtn: {
    padding: '0.75rem 1.25rem',
    gap: '0.5rem',
    fontSize: '0.9rem',
  },
  dealsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1.25rem',
  },

  dealCardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  dealInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dealTitle: {
    fontSize: '1.2rem',
    fontWeight: '800',
    color: 'var(--text-main)',
  },
  dealPrice: {
    padding: '0.4rem 0.8rem',
    backgroundColor: 'var(--primary-yellow)',
    color: '#000',
    borderRadius: '8px',
    fontWeight: '800',
    fontSize: '0.9rem',
  },
  dealItemsPreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '1rem',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid var(--glass-border)',
  },
  dealItemRow: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    borderTop: '1px solid var(--glass-border)',
    paddingTop: '1rem',
  },
  iconBtn: {
    padding: '0.5rem',
    color: 'var(--text-muted)',
  },
  
  creatorContainer: {
    display: 'flex',
    gap: '1.25rem',
    height: 'calc(100vh - 120px)',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  itemsSide: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    overflow: 'hidden',
    minWidth: 0,
  },
  selectorHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  searchBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '1rem',
    color: 'var(--text-muted)',
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 3rem',
    borderRadius: '10px',
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-main)',
  },
  categoryTabs: {
    display: 'flex',
    gap: '0.5rem',
    overflowX: 'auto',
    paddingBottom: '0.5rem',
  },
  tab: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    border: '1px solid var(--glass-border)',
    cursor: 'pointer',
  },
  subTab: {
    padding: '0.3rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.72rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    border: '1px solid var(--glass-border)',
    cursor: 'pointer',
  },
  subCategoryTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem',
    marginTop: '0.5rem',
    width: '100%',
    minWidth: 0,
  },
  itemsGridSmall: {
    flex: 1,
    overflowY: 'auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    paddingRight: '0.5rem',
  },
  itemCard: {
    padding: '0.75rem',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease, background-color 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    height: 'fit-content',
  },
  itemImageContainer: {
    position: 'relative',
    aspectRatio: '4/3',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  priceBadge: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    padding: '0.25rem 0.5rem',
    backgroundColor: 'var(--primary-yellow)',
    color: '#000',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '800',
  },
  cardInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    lineHeight: '1.2',
    wordBreak: 'break-word',
  },
  addBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    color: 'var(--primary-yellow)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  configSide: {
    width: '380px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    background: 'var(--bg-card)',
    height: 'calc(100vh - 120px)',
    overflowY: 'auto',
    boxSizing: 'border-box',
    paddingRight: '0.5rem',
  },
  selectedItemsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  selectedItemsScroll: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    boxSizing: 'border-box',
  },
  saveBtnContainer: {
    display: 'flex',
    gap: '1rem',
    marginTop: '0.25rem',
  },
  saveBtnWide: {
    flex: 1,
    padding: '0.6rem 1.5rem',
    gap: '0.5rem',
    fontSize: '0.9rem',
  },
  configHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '0.5rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  majorInput: {
    width: '100%',
    padding: '0.6rem 0.8rem',
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    borderRadius: '10px',
    color: 'var(--text-main)',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxSizing: 'border-box',
  },
  selectedItemsList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    overflow: 'hidden',
  },
  itemsScroll: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    paddingRight: '0.4rem',
  },
  selectedItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0.6rem',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: '10px',
    border: '1px solid var(--glass-border)',
    boxSizing: 'border-box',
  },
  selInfo: {
    flex: 1,
  },
  selName: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  selMeta: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
  },
  qtyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  miniQtyBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    backgroundColor: 'var(--glass)',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selRemove: {
    color: 'var(--accent-red)',
    opacity: 0.6,
    marginLeft: '0.2rem',
  },
  saveBtn: {
    width: '100%',
    padding: '1rem',
    gap: '0.75rem',
    fontSize: '1rem',
  },
  emptyPrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
    color: 'var(--text-muted)',
    opacity: 0.5,
    fontSize: '0.85rem',
  },
  emptyState: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  menuDealCard: {
    backgroundColor: 'var(--glass)',
    borderRadius: '16px',
    border: '1px solid var(--glass-border)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  menuDotContainer: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    zIndex: 10,
  },
  menuDotBtn: {
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
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
    width: '110px',
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
  menuDealHeaderContainer: {
    marginBottom: '1rem',
    width: '100%',
    paddingRight: '2rem',
  },
  menuDealHeaderPatch: {
    color: 'var(--text-main)',
    fontWeight: '800',
    fontSize: '1.2rem',
    letterSpacing: '-0.5px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  menuDealItemsArea: {
    color: 'var(--text-muted)',
    fontWeight: '500',
    fontSize: '0.85rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    marginBottom: '1rem',
    flexGrow: 1,
  },
  menuDealItemRow: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  menuDealImageContainer: {
    aspectRatio: '16/9',
    width: '100%',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '1rem',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  menuDealImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  menuDealPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--glass)',
  },
  menuDealPriceContainer: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    marginTop: 'auto',
    paddingTop: '1rem',
    borderTop: '1px solid var(--glass-border)',
  },
  menuDealPricePatch: {
    color: 'var(--primary-yellow)',
    fontWeight: '800',
    fontSize: '1.25rem',
  },
  dealUploadArea: {
    border: '2px dashed var(--glass-border)',
    borderRadius: '10px',
    height: '70px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'var(--glass)',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
  },
  dealPreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-main)',
    border: '1px solid var(--glass-border)',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 10,
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
  },
  dealUploadPrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
  },
  selectedItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  selectedItemThumb: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    objectFit: 'cover',
    border: '1px solid var(--glass-border)',
  }
};

export default Deals;
