import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, Package, Tag, Save, Upload, X } from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '../../utils/api';


const DealCreator = ({ items, categories, initialData, onSave, onCancel }) => {
  const [dealName, setDealName] = useState('');
  const [dealPrice, setDealPrice] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [dealImage, setDealImage] = useState(null);
  const [dealImagePreview, setDealImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSubCategory, setActiveSubCategory] = useState('All');
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  const [showItemVariantModal, setShowItemVariantModal] = useState(false);
  const [selectedItemForVariant, setSelectedItemForVariant] = useState(null);
  const [variantQuantities, setVariantQuantities] = useState({});

  useEffect(() => {
    if (initialData) {
      setDealName(initialData.name);
      setDealPrice(initialData.price);
      setSelectedItems(initialData.items.filter(i => i.item).map(i => {
        const isVar = !!i.variant;
        const vObj = isVar && i.item?.variants?.find(v => v.name === i.variant);
        return {
          ...i.item,
          uniqueId: i.variant ? `${i.item._id}-${i.variant}` : i.item._id,
          name: i.variant ? `${i.item.name} (${i.variant})` : i.item.name,
          price: vObj ? vObj.price : (i.item?.price || 0),
          chosenVariant: i.variant || null,
          quantity: i.quantity
        };
      }));
      setDealImagePreview(initialData.image || null);
    }
  }, [initialData]);

  const handleDealImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDealImage(file);
      setDealImagePreview(URL.createObjectURL(file));
    }
  };

  const addToDeal = (item, chosenVariant = null, customQuantity = 1) => {
    if (item.variants && item.variants.length > 0 && !chosenVariant) {
      setSelectedItemForVariant(item);
      const initialQuantities = {};
      item.variants.forEach(v => {
        initialQuantities[v.name] = 0;
      });
      setVariantQuantities(initialQuantities);
      setShowItemVariantModal(true);
      return;
    }

    setSelectedItems(prev => {
      const uniqueId = chosenVariant ? `${item._id}-${chosenVariant.name}` : item._id;
      const itemName = chosenVariant ? `${item.name} (${chosenVariant.name})` : item.name;
      const itemPrice = chosenVariant ? chosenVariant.price : item.price;

      const existing = prev.find(i => (i.uniqueId || i._id) === uniqueId);
      if (existing) {
        return prev.map(i => (i.uniqueId || i._id) === uniqueId ? { ...i, quantity: i.quantity + customQuantity } : i);
      }
      return [...prev, { 
        ...item, 
        uniqueId,
        name: itemName,
        price: itemPrice,
        chosenVariant: chosenVariant ? chosenVariant.name : null,
        quantity: customQuantity 
      }];
    });
  };

  const removeFromDeal = (uniqueId) => {
    setSelectedItems(prev => prev.filter(i => (i.uniqueId || i._id) !== uniqueId));
  };

  const updateItemQty = (uniqueId, delta) => {
    setSelectedItems(prev => prev.map(i => {
      if ((i.uniqueId || i._id) === uniqueId) {
        const newQty = i.quantity + delta;
        return newQty > 0 ? { ...i, quantity: newQty } : i;
      }
      return i;
    }));
  };

  const handleSaveDeal = async () => {
    if (!dealName || !dealPrice || selectedItems.length === 0) {
      alert('Please fill all fields and add at least one item');
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    const data = new FormData();
    data.append('name', dealName);
    data.append('price', dealPrice);
    data.append('items', JSON.stringify(selectedItems.map(i => ({
      item: i._id,
      quantity: i.quantity,
      variant: i.chosenVariant
    }))));
    if (dealImage) {
      data.append('image', dealImage);
    }

    try {
      if (initialData) {
        const res = await axios.put(getApiUrl(`/api/deals/${initialData._id}`), data);
        onSave(res.data, true);
      } else {
        const res = await axios.post(getApiUrl('/api/deals'), data);
        onSave(res.data, false);
      }

    } catch (err) {
      console.error(err);
      alert('Failed to save deal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category?.name === activeCategory;
    const matchesSubCategory = activeSubCategory === 'All' || item.subCategory === activeSubCategory;
    const matchesSearch = item.name.toLowerCase().includes(itemSearchQuery.toLowerCase());
    return matchesCategory && matchesSubCategory && matchesSearch;
  });

  return (
    <div className="responsive-flex" style={styles.creatorContainer}>
      <div style={styles.itemsSide}>
        <div style={styles.selectorHeader}>
          <div style={styles.searchBox}>
            <Search size={18} style={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Find items..." 
              style={styles.searchInput}
              value={itemSearchQuery}
              onChange={(e) => setItemSearchQuery(e.target.value)}
            />
          </div>

          <div style={styles.categoryTabs}>
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

          {activeCategory !== 'All' && (
            (() => {
              const currentCat = categories.find(cat => cat.name === activeCategory);
              const subCats = currentCat?.subCategories || [];
              if (subCats.length === 0) return null;
              return (
                <div style={styles.subCategoryTabs}>
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
        </div>

        {React.useMemo(() => (
          <div className="items-grid" style={styles.itemsGridSmall}>
            {filteredItems.map(item => (
              <div 
                key={item._id} 
                className="glass-card" 
                style={styles.itemCard}
                onClick={() => addToDeal(item)}
              >
                <div style={styles.itemImageContainer}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} style={styles.itemImage} />
                  ) : (
                    <div style={{...styles.itemImage, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)'}}>
                      <Package size={24} color="var(--primary-yellow)" />
                    </div>
                  )}
                  <div style={styles.priceBadge}>Rs. {item.price}</div>
                </div>
                <div style={styles.cardInfo}>
                  <h4 style={styles.itemName}>{item.name}</h4>
                  <div style={styles.addBtn}>
                    <Plus size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ), [filteredItems])}
      </div>

      <div className="glass-card fixed-side-panel" style={styles.configSide}>
        <div style={styles.configHeader}>
          <h3 style={{ fontWeight: '800' }}>{initialData ? 'Edit Deal' : 'New Deal Setup'}</h3>
          <Tag size={20} style={{ opacity: 0.5 }} />
        </div>

        <div style={styles.selectedItemsSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={styles.label}>Selected Items ({selectedItems.length})</label>
            {selectedItems.length > 0 && (
              <span style={{ fontSize: '0.85rem', color: 'var(--primary-yellow)', fontWeight: '800' }}>
                Total: Rs. {selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)}
              </span>
            )}
          </div>
          <div style={styles.selectedItemsScroll}>
            {selectedItems.length > 0 ? (
              selectedItems.map(item => {
                const identifier = item.uniqueId || item._id;
                return (
                  <div key={identifier} style={styles.selectedItem}>
                    <div style={styles.selectedItemLeft}>
                      {item.image ? (
                        <img src={item.image} alt={item.name} style={styles.selectedItemThumb} />
                      ) : (
                        <div style={{...styles.selectedItemThumb, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)'}}>
                          <Package size={16} color="var(--primary-yellow)" />
                        </div>
                      )}
                      <div style={styles.selInfo}>
                        <p style={styles.selName}>{item.name}</p>
                        <p style={styles.selMeta}>
                          Rs. {item.price} &times; {item.quantity} = <span style={{color:'var(--primary-yellow)', fontWeight:'700'}}>Rs. {item.price * item.quantity}</span>
                        </p>
                      </div>
                    </div>
                    <div style={styles.qtyRow}>
                      <button onClick={() => updateItemQty(identifier, -1)} style={styles.miniQtyBtn}><Minus size={12} /></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateItemQty(identifier, 1)} style={styles.miniQtyBtn}><Plus size={12} /></button>
                      <button onClick={() => removeFromDeal(identifier)} style={styles.selRemove}><Trash2 size={16} /></button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={styles.emptyPrompt}>
                <Package size={32} style={{ opacity: 0.1, marginBottom: '0.5rem' }} />
                <p>Select items from the left to build the deal</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
          <div style={{ ...styles.inputGroup, flex: 2 }}>
            <label style={styles.label}>Deal Name / Number</label>
            <input 
              type="text" 
              placeholder="e.g. Super Saver Deal 1" 
              style={styles.majorInput}
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
            />
          </div>
          <div style={{ ...styles.inputGroup, flex: 1 }}>
            <label style={styles.label}>Price (Rs.)</label>
            <input 
              type="number" 
              placeholder="0" 
              style={styles.majorInput}
              value={dealPrice}
              onChange={(e) => setDealPrice(e.target.value)}
            />
          </div>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Deal Image</label>
          <div style={styles.dealUploadArea} onClick={(e) => {
            if(e.target.closest('button')) return;
            document.getElementById('dealImageInput').click();
          }}>
            {dealImagePreview ? (
              <>
                <img src={dealImagePreview} alt="Deal Preview" style={styles.dealPreviewImg} />
                <button 
                  type="button"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setDealImage(null); 
                    setDealImagePreview(null); 
                  }} 
                  style={styles.removeImageBtn}
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <div style={styles.dealUploadPrompt}>
                <Upload size={18} />
                <span>Upload Image</span>
              </div>
            )}
            <input 
              id="dealImageInput" 
              type="file" 
              onChange={handleDealImageChange} 
              hidden 
              accept="image/*"
            />
          </div>
        </div>

        <div style={styles.saveBtnContainer}>
          <button 
            onClick={onCancel} 
            className="btn-secondary" 
            style={{...styles.saveBtnWide, borderRadius: '12px', backgroundColor: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)'}}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveDeal} 
            className="btn-primary" 
            style={styles.saveBtnWide}
            disabled={!dealName || !dealPrice || selectedItems.length === 0 || isSubmitting}
          >
            <Save size={20} /> {isSubmitting ? 'Saving...' : (initialData ? 'Update Deal' : 'Save Deal')}
          </button>
        </div>
      </div>

      {showItemVariantModal && selectedItemForVariant && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-card" style={{ width: '380px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', color: 'var(--text-main)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>Select Variant</h3>
              <button onClick={() => setShowItemVariantModal(false)} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Choose quantities for <strong style={{ color: 'var(--text-main)' }}>{selectedItemForVariant.name}</strong> options:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {selectedItemForVariant.variants.map((v, idx) => {
                const qty = variantQuantities[v.name] || 0;
                return (
                  <div 
                    key={idx} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '0.75rem 1rem', 
                      borderRadius: '10px', 
                      border: '1px solid', 
                      borderColor: qty > 0 ? 'var(--primary-yellow)' : 'var(--glass-border)',
                      backgroundColor: qty > 0 ? 'rgba(250, 204, 21, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>{v.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--primary-yellow)', fontWeight: '700' }}>Rs. {v.price}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button 
                        type="button"
                        onClick={() => {
                          setVariantQuantities(prev => ({
                            ...prev,
                            [v.name]: Math.max(0, qty - 1)
                          }));
                        }}
                        style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ fontSize: '0.95rem', fontWeight: '700', color: qty > 0 ? 'var(--text-main)' : 'var(--text-muted)', minWidth: '20px', textAlign: 'center' }}>
                        {qty}
                      </span>
                      <button 
                        type="button"
                        onClick={() => {
                          setVariantQuantities(prev => ({
                            ...prev,
                            [v.name]: qty + 1
                          }));
                        }}
                        style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button 
                onClick={() => setShowItemVariantModal(false)} 
                style={{ flex: 1, padding: '0.75rem', backgroundColor: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  let addedAny = false;
                  selectedItemForVariant.variants.forEach(v => {
                    const qty = variantQuantities[v.name] || 0;
                    if (qty > 0) {
                      addToDeal(selectedItemForVariant, v, qty);
                      addedAny = true;
                    }
                  });
                  if (addedAny) {
                    setShowItemVariantModal(false);
                    setSelectedItemForVariant(null);
                    setVariantQuantities({});
                  }
                }} 
                style={{ flex: 2, padding: '0.75rem', backgroundColor: 'var(--primary-yellow)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                disabled={!Object.values(variantQuantities).some(q => q > 0)}
              >
                Add to Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
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
  subCategoryTabs: {
    display: 'flex',
    gap: '0.5rem',
    overflowX: 'auto',
    paddingBottom: '0.5rem',
  },
  subTab: {
    padding: '0.4rem 0.8rem',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  itemsGridSmall: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '0.75rem',
    overflowY: 'auto',
    paddingRight: '0.5rem',
  },
  itemCard: {
    padding: '0.5rem',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    transition: 'all 0.2s',
  },
  itemImageContainer: {
    position: 'relative',
    width: '100%',
    height: '80px',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  dealPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  priceBadge: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    backgroundColor: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(4px)',
    color: 'var(--primary-yellow)',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '700',
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
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  addBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    backgroundColor: 'var(--primary-yellow)',
    color: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configSide: {
    width: '380px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '1rem',
    height: 'fit-content',
    maxHeight: '100%',
  },
  configHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
  },
  majorInput: {
    padding: '0.4rem 0.6rem',
    borderRadius: '6px',
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-main)',
    fontSize: '0.85rem',
    fontWeight: '600',
    width: '100%',
  },
  dealUploadArea: {
    border: '2px dashed var(--glass-border)',
    borderRadius: '6px',
    padding: '0.4rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--glass)',
    cursor: 'pointer',
    position: 'relative',
    height: '45px',
    overflow: 'hidden',
  },
  dealPreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '8px',
  },
  removeImageBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(4px)',
  },
  dealUploadPrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
  },
  selectedItemsSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    overflow: 'hidden',
  },
  selectedItemsScroll: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    paddingRight: '0.5rem',
  },
  selectedItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    border: '1px solid var(--glass-border)',
  },
  selectedItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  selectedItemThumb: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    objectFit: 'cover',
  },
  selInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  selName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  selMeta: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  qtyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  miniQtyBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  selRemove: {
    padding: '0.4rem',
    color: 'var(--accent-red)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    marginLeft: '0.5rem',
  },
  emptyPrompt: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  saveBtnContainer: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: 'auto',
  },
  saveBtnWide: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    fontSize: '0.95rem',
  },
};

export default DealCreator;
