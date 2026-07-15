import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Spinner } from '../components/ui/spinner-1';
import { Search, Plus, Minus, Trash2, Printer, ShoppingCart, Package, Tag, X, Clock, LogOut, Archive } from 'lucide-react';
import CheckoutModal from '../components/pos/CheckoutModal';
import VariantSelectionModal from '../components/pos/VariantSelectionModal';

import DealVariantSelectionModal from '../components/pos/DealVariantSelectionModal';
import { useData } from '../context/DataContext';

import { triggerBrowserPrint } from '../utils/browserPrint';

const generateMongoObjectId = () => {
  const timestamp = Math.floor(new Date().getTime() / 1000).toString(16).padStart(8, '0');
  const randomChars = 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => Math.floor(Math.random() * 16).toString(16));
  return timestamp + randomChars;
};

const POS = () => {
  const [currentOrderId, setCurrentOrderId] = useState(() => generateMongoObjectId());
  const isItemLowStock = (item, ingredientsList) => {
    if (item.trackDirectStock) {
      return item.stockQuantity <= item.lowStockThreshold;
    }
    if (item.recipe && item.recipe.length > 0 && ingredientsList) {
      return item.recipe.some(ri => {
        const ing = ingredientsList.find(i => i._id === ri.ingredientId);
        return ing && (ing.stockQuantity <= ing.lowStockThreshold);
      });
    }
    return false;
  };

  const { items, categories, deals, ingredients, isDataLoading } = useData();
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSubCategory, setActiveSubCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart/Bill State
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('Dine-in');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');

  const [printType, setPrintType] = useState('RECEIPT');
  const [heldOrders, setHeldOrders] = useState([]);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [printerType, setPrinterType] = useState('auto');
  const [storeConfig, setStoreConfig] = useState({});

  // Custom Modal for Hold Bill
  const [showHoldPrompt, setShowHoldPrompt] = useState(false);
  const [holdNoteInput, setHoldNoteInput] = useState('');

  // Custom Modal for Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  // Cash Calculator / Checkout Modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Variant Selection State

  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedVariantItem, setSelectedVariantItem] = useState(null);
  const [variantQuantities, setVariantQuantities] = useState({});

  // Deal Variant Selection State
  const [showDealVariantModal, setShowDealVariantModal] = useState(false);
  const [selectedDealForVariants, setSelectedDealForVariants] = useState(null);
  const [selectedDealVariants, setSelectedDealVariants] = useState({});

  // Custom Alert Modal State
  const [alertConfig, setAlertConfig] = useState({ show: false, message: '', title: 'Notification', type: 'info', onConfirm: null });

  const showAlert = (message, title = 'Notification', type = 'info') => {
    setAlertConfig({ show: true, message, title, type, onConfirm: null });
  };

  const showConfirm = (message, title, onConfirm) => {
    setAlertConfig({ show: true, message, title, type: 'confirm', onConfirm });
  };

  useEffect(() => {
    const storedHolds = localStorage.getItem('angaara_held_orders');
    if (storedHolds) {
      try {
        setHeldOrders(JSON.parse(storedHolds));
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    const fetchPrinterAndStore = async () => {
      try {
        const statusRes = await api.get('/api/print/status');
        if (statusRes.data && statusRes.data.type) {
          setPrinterType(statusRes.data.type);
        }
        const storeRes = await api.get('/api/print/store-config');
        if (storeRes.data) {
          setStoreConfig(storeRes.data);
        }
      } catch (err) {
        console.error('Error fetching printer/store status:', err);
      }
    };
    fetchPrinterAndStore();
  }, []);

  const addToCart = (item, chosenVariant = null, chosenDealItemVariants = null, customQuantity = 1) => {
    // 1. If it's a Deal
    if (item.items) {
      // Find sub-items that have variants but DO NOT have a preset variant selected in the deal config
      const itemsWithVariants = item.items.filter(di => di.item && di.item.variants && di.item.variants.length > 0 && !di.variant);
      if (itemsWithVariants.length > 0 && !chosenDealItemVariants) {
        setSelectedDealForVariants(item);
        // Pre-select the first variant for each item that needs selection
        const initialSelections = {};
        item.items.forEach((di, idx) => {
          if (di.item && di.item.variants && di.item.variants.length > 0 && !di.variant) {
            initialSelections[idx] = di.item.variants[0];
          }
        });
        setSelectedDealVariants(initialSelections);
        setShowDealVariantModal(true);
        return;
      }
    }

    // 2. If it's a regular item that has variants and no variant has been selected yet
    if (!item.items && item.variants && item.variants.length > 0 && !chosenVariant) {
      setSelectedVariantItem(item);
      const initialQuantities = {};
      item.variants.forEach(v => {
        initialQuantities[v.name] = 0;
      });
      setVariantQuantities(initialQuantities);
      setShowVariantModal(true);
      return;
    }

    setCart(prev => {
      let cartItemId = item._id;
      let itemName = item.name;
      let itemPrice = item.price;
      let clonedItems = item.items ? [...item.items] : null;

      if (item.items) {
        // Build the unique suffix by combining preset variants and custom chosen variants
        const suffixParts = [];
        clonedItems = item.items.map((di, idx) => {
          let vName = di.variant;
          if (chosenDealItemVariants && chosenDealItemVariants[idx]) {
            vName = chosenDealItemVariants[idx].name;
          }
          if (vName) {
            suffixParts.push(`${idx}-${vName}`);
            return {
              ...di,
              chosenVariant: vName
            };
          }
          return di;
        });

        if (suffixParts.length > 0) {
          cartItemId = `${item._id}-${suffixParts.join('-')}`;

          // Construct inline text description of selected variants
          const selectedText = clonedItems
            .filter(di => di.chosenVariant)
            .map(di => di.chosenVariant)
            .join(', ');

          itemName = `${item.name} (${selectedText})`;
        }
      } else if (chosenVariant) {
        // Regular item with variant
        cartItemId = `${item._id}-${chosenVariant.name}`;
        itemName = `${item.name} (${chosenVariant.name})`;
        itemPrice = chosenVariant.price;
      }

      const existing = prev.find(i => i._id === cartItemId);
      if (existing) {
        return prev.map(i => i._id === cartItemId ? { ...i, quantity: i.quantity + customQuantity } : i);
      }
      return [...prev, {
        ...item,
        _id: cartItemId,
        originalId: item._id,
        name: itemName,
        price: itemPrice,
        items: clonedItems,
        chosenVariant: chosenVariant ? chosenVariant.name : null,
        quantity: customQuantity,
        isPrinted: false
      }];
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item._id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const displayItems = activeCategory === 'Deals'
    ? deals.filter(deal => deal.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : items.filter(item => {
      const matchesCategory = activeCategory === 'All' || item.category?.name === activeCategory;
      const matchesSubCategory = activeSubCategory === 'All' || item.subCategory === activeSubCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSubCategory && matchesSearch;
    });

  const groupedItems = useMemo(() => {
    if (activeCategory === 'Deals') {
      return { 'Deals': displayItems };
    }

    const groups = {};
    displayItems.forEach(item => {
      const sub = item.subCategory && item.subCategory.trim() ? item.subCategory.trim() : 'Uncategorized';
      if (!groups[sub]) {
        groups[sub] = [];
      }
      groups[sub].push(item);
    });

    // Sort keys based on category's defined subCategories array
    const currentCategoryObj = categories.find(cat => cat.name === activeCategory);
    const orderedSubCats = currentCategoryObj?.subCategories || [];

    const sortedGroups = {};

    // First, add groups in the order specified by the category
    orderedSubCats.forEach(sub => {
      const matchingKey = Object.keys(groups).find(k => k.toLowerCase() === sub.toLowerCase());
      if (matchingKey) {
        sortedGroups[matchingKey] = groups[matchingKey];
        delete groups[matchingKey];
      }
    });

    // Then, add any remaining groups (e.g. Uncategorized or dynamically added ones)
    Object.keys(groups).forEach(key => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }, [displayItems, activeCategory, categories]);

  const handleSendToKitchen = async () => {
    const unprintedItems = cart.filter(item => !item.isPrinted);
    if (unprintedItems.length === 0) {
      showAlert('No new items to send to kitchen.', 'Notice');
      return;
    }
    
    // Check if this is an add-on KOT
    const isAddon = cart.some(item => item.isPrinted);

    const getItemsByKitchenType = (typeFilter) => {
      return unprintedItems
        .map(item => {
          if (item.items && item.items.length > 0) {
            const matchingSubItems = item.items.filter(di => {
              const kt = di.item?.kitchenType || 'Fast Food';
              return typeFilter(kt);
            });
            return matchingSubItems.length > 0 ? { ...item, items: matchingSubItems } : null;
          }
          const kt = item.kitchenType || 'Fast Food';
          return typeFilter(kt) ? item : null;
        })
        .filter(Boolean);
    };

    let bbqItems = getItemsByKitchenType(kt => kt === 'BBQ');
    let fastFoodItems = getItemsByKitchenType(kt => kt === 'Fast Food');
    let drinkItems = getItemsByKitchenType(kt => kt === 'Drinks/Extras');

    // Routing drinks based on order composition
    if (fastFoodItems.length > 0) {
      fastFoodItems = [...fastFoodItems, ...drinkItems];
    } else if (bbqItems.length > 0) {
      bbqItems = [...bbqItems, ...drinkItems];
    } else if (drinkItems.length > 0) {
      fastFoodItems = [...drinkItems];
    }

    const isBrowserPrint = printerType === 'browser' || window.location.hostname.includes('vercel.app');

    if (isBrowserPrint) {
      if (bbqItems.length > 0) {
        triggerBrowserPrint({
          type: 'KOT_DESI',
          items: bbqItems,
          orderType,
          isAddon,
          orderId: currentOrderId
        }, storeConfig);
      }
      if (fastFoodItems.length > 0) {
        if (bbqItems.length > 0) {
          setTimeout(() => {
            triggerBrowserPrint({
              type: 'KOT_FASTFOOD',
              items: fastFoodItems,
              orderType,
              isAddon,
              orderId: currentOrderId
            }, storeConfig);
          }, 1000);
        } else {
          triggerBrowserPrint({
            type: 'KOT_FASTFOOD',
            items: fastFoodItems,
            orderType,
            isAddon,
            orderId: currentOrderId
          }, storeConfig);
        }
      }
      setCart(prev => prev.map(i => ({...i, isPrinted: true})));
      showAlert('KOT sent to kitchen printers successfully!', 'Success', 'success');
      return;
    }

    try {
      let bbqSimulated = false;
      let fastFoodSimulated = false;

      if (bbqItems.length > 0) {
        const res = await api.post('/api/print', {
          type: 'KOT_DESI',
          items: bbqItems,
          orderType,
          isAddon,
          orderId: currentOrderId
        });
        if (res.data && res.data.message && res.data.message.includes('Simulated print')) {
          bbqSimulated = true;
        }
      }
      
      if (fastFoodItems.length > 0) {
        const res = await api.post('/api/print', {
          type: 'KOT_FASTFOOD',
          items: fastFoodItems,
          orderType,
          isAddon,
          orderId: currentOrderId
        });
        if (res.data && res.data.message && res.data.message.includes('Simulated print')) {
          fastFoodSimulated = true;
        }
      }

      if (bbqSimulated) {
        triggerBrowserPrint({
          type: 'KOT_DESI',
          items: bbqItems,
          orderType,
          isAddon,
          orderId: currentOrderId
        }, storeConfig);
      }
      if (fastFoodSimulated) {
        if (bbqSimulated) {
          setTimeout(() => {
            triggerBrowserPrint({
              type: 'KOT_FASTFOOD',
              items: fastFoodItems,
              orderType,
              isAddon,
              orderId: currentOrderId
            }, storeConfig);
          }, 1000);
        } else {
          triggerBrowserPrint({
            type: 'KOT_FASTFOOD',
            items: fastFoodItems,
            orderType,
            isAddon,
            orderId: currentOrderId
          }, storeConfig);
        }
      }
      
      setCart(prev => prev.map(i => ({...i, isPrinted: true})));
      showAlert('KOT sent to kitchen printers successfully!', 'Success', 'success');
    } catch (err) {
      console.error(err);
      showAlert('Error printing KOT to kitchen. Check printer connection.', 'Error', 'error');
    }
  };

  const handleHoldOrderClick = () => {
    if (cart.length === 0) return;
    setHoldNoteInput('');
    setShowHoldPrompt(true);
  };

  const confirmHoldOrder = () => {
    const note = holdNoteInput.trim() || `Order ${new Date().toLocaleTimeString()}`;
    const newHold = {
      id: Date.now().toString(),
      orderId: currentOrderId,
      note,
      cart,
      orderType,
      customerName,
      customerPhone,
      total,
      time: new Date().toLocaleTimeString()
    };
    const updatedHolds = [...heldOrders, newHold];
    setHeldOrders(updatedHolds);
    localStorage.setItem('angaara_held_orders', JSON.stringify(updatedHolds));

    setCart([]);
    setOrderType('Dine-in');
    setCustomerName('');
    setCustomerPhone('');
    setCurrentOrderId(generateMongoObjectId());
    setShowHoldPrompt(false);
  };

  const handleResumeOrder = (heldOrder) => {
    const doResume = () => {
      setCart(heldOrder.cart);
      setOrderType(heldOrder.orderType);
      setCustomerName(heldOrder.customerName || '');
      setCustomerPhone(heldOrder.customerPhone || '');
      setCurrentOrderId(heldOrder.orderId || generateMongoObjectId());

      const updatedHolds = heldOrders.filter(h => h.id !== heldOrder.id);
      setHeldOrders(updatedHolds);
      localStorage.setItem('angaara_held_orders', JSON.stringify(updatedHolds));
      setShowHeldModal(false);
    };

    if (cart.length > 0) {
      showConfirm("Current cart is not empty. Replace it?", "Warning", doResume);
    } else {
      doResume();
    }
  };

  const handleDeleteHoldClick = (id) => {
    setOrderToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteHold = () => {
    if (!orderToDelete) return;
    const updatedHolds = heldOrders.filter(h => h.id !== orderToDelete);
    setHeldOrders(updatedHolds);
    localStorage.setItem('angaara_held_orders', JSON.stringify(updatedHolds));
    setShowDeleteConfirm(false);
    setOrderToDelete(null);
  };

  const handleCheckoutAndPrint = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const saleItems = cart.map(item => ({
        itemId: item.originalId || item._id,
        name: item.name,
        type: item.items ? 'deal' : 'item',
        categoryName: item.items ? 'Deals' : (item.category?.name || 'Uncategorized'),
        price: item.price,
        quantity: item.quantity
      }));

      const res = await api.post('/api/sales', {
        _id: currentOrderId,
        items: saleItems,
        totalAmount: total,
        orderType,
        customerName: orderType === 'Delivery' ? customerName : '',
        customerPhone: orderType === 'Delivery' ? customerPhone : ''
      });

      const finalCart = [...cart];
      const finalOrderId = res.data._id;
      const finalOrderType = orderType;
      const finalCustomerName = customerName;
      const finalCustomerPhone = customerPhone;
      const finalTotal = total;

      setCart([]);
      setOrderType('Dine-in');
      setCustomerName('');
      setCustomerPhone('');
      setShowCheckoutModal(false);
      setCashReceived('');
      setCurrentOrderId(generateMongoObjectId());
      showAlert('Sale saved and receipt printed successfully!', 'Success', 'success');

      (async () => {
        try {
          const isBrowserPrint = printerType === 'browser' || window.location.hostname.includes('vercel.app');

          if (isBrowserPrint) {
            triggerBrowserPrint({
              type: 'CUSTOMER_RECEIPT',
              items: finalCart,
              orderType: finalOrderType,
              customerName: finalCustomerName,
              customerPhone: finalOrderType === 'Delivery' ? finalCustomerPhone : '',
              totalAmount: finalTotal,
              orderId: finalOrderId
            }, storeConfig);
          } else {
            const printRes = await api.post('/api/print', {
              type: 'CUSTOMER_RECEIPT',
              items: finalCart,
              orderType: finalOrderType,
              customerName: finalCustomerName,
              customerPhone: finalOrderType === 'Delivery' ? finalCustomerPhone : '',
              totalAmount: finalTotal,
              orderId: finalOrderId
            });

            if (printRes.data && printRes.data.message && printRes.data.message.includes('Simulated print')) {
              triggerBrowserPrint({
                type: 'CUSTOMER_RECEIPT',
                items: finalCart,
                orderType: finalOrderType,
                customerName: finalCustomerName,
                customerPhone: finalOrderType === 'Delivery' ? finalCustomerPhone : '',
                totalAmount: finalTotal,
                orderId: finalOrderId
              }, storeConfig);
            }
          }
        } catch (printErr) {
          console.error('Background printing error:', printErr);
        }
      })();
    } catch (err) {
      console.error(err);
      showAlert('Error during checkout or printing. Check connection.', 'Error', 'error');
    } finally {
      setIsSubmitting(false);
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
      <div className="responsive-flex" style={styles.posContainer}>
        {/* Left Side: Items Selection */}
        <div style={styles.menuSide}>
          <div style={styles.menuHeader}>
            <div style={styles.searchContainer}>
              <Search size={18} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search items..."
                style={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={styles.categoriesScroll}>
              <button
                onClick={() => { setActiveCategory('All'); setActiveSubCategory('All'); }}
                style={{
                  ...styles.catTab,
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
                    ...styles.catTab,
                    backgroundColor: activeCategory === cat.name ? 'var(--primary-yellow)' : 'var(--glass)',
                    color: activeCategory === cat.name ? '#000' : 'var(--text-main)',
                  }}
                >
                  {cat.name}
                </button>
              ))}
              <button
                onClick={() => { setActiveCategory('Deals'); setActiveSubCategory('All'); }}
                style={{
                  ...styles.catTab,
                  backgroundColor: activeCategory === 'Deals' ? 'var(--primary-yellow)' : 'var(--glass)',
                  color: activeCategory === 'Deals' ? '#000' : 'var(--text-main)',
                }}
              >
                Deals
              </button>
            </div>

            {activeCategory !== 'All' && activeCategory !== 'Deals' && (
              (() => {
                const currentCat = categories.find(cat => cat.name === activeCategory);
                const subCats = currentCat?.subCategories || [];
                if (subCats.length === 0) return null;
                return (
                  <div style={styles.subCategoriesScroll}>
                    <button
                      onClick={() => setActiveSubCategory('All')}
                      style={{
                        ...styles.subCatTab,
                        backgroundColor: activeSubCategory === 'All' ? 'var(--primary-yellow)' : 'var(--glass)',
                        color: activeSubCategory === 'All' ? '#000' : 'var(--text-main)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      All Option
                    </button>
                    {subCats.map((sub, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveSubCategory(sub)}
                        style={{
                          ...styles.subCatTab,
                          backgroundColor: activeSubCategory === sub ? 'var(--primary-yellow)' : 'var(--glass)',
                          color: activeSubCategory === sub ? '#000' : 'var(--text-main)',
                          border: '1px solid var(--glass-border)',
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

          <div className="items-container" style={styles.itemsContainer}>
            {isDataLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', width: '100%' }}>
                <Spinner size={40} color="var(--primary-yellow)" />
              </div>
            ) : Object.keys(groupedItems).length > 0 ? (
              Object.keys(groupedItems).map(subCat => {
                const groupItems = groupedItems[subCat];
                const showHeading = Object.keys(groupedItems).length > 1 || (subCat !== 'Uncategorized' && subCat !== 'Deals');

                return (
                  <div key={subCat} style={styles.subCatSection}>
                    {showHeading && (
                      <h4 style={styles.subCatHeading}>{subCat}</h4>
                    )}
                    <div className="items-grid" style={styles.itemsGrid}>
                      {groupItems.map(item => {
                        const isDeal = !!item.items;
                        if (isDeal) {
                          return (
                            <div
                              key={item._id}
                              className="glass-card"
                              style={styles.itemCard}
                              onClick={() => addToCart(item)}
                            >
                              <div style={styles.itemImageContainer}>
                                {item.image ? (
                                  <img src={item.image} alt={item.name} style={styles.itemImage} />
                                ) : (
                                  <div style={{...styles.itemImage, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)'}}>
                                    <Tag size={24} color="var(--primary-yellow)" />
                                  </div>
                                )}
                                <div style={styles.priceBadge}>Rs. {item.price}</div>
                              </div>
                              <div style={styles.cardInfo}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                                  <h4 style={{ ...styles.itemName, margin: 0 }} title={item.name}>{item.name}</h4>
                                  <p style={styles.dealItemsText} title={item.items.map(di => `${di.quantity}x ${di.item?.name || 'Item'}`).join(', ')}>
                                    {item.items.map(di => `${di.quantity}x ${di.item?.name || 'Item'}`).join(', ')}
                                  </p>
                                </div>
                                <div style={styles.addBtn}>
                                  <Plus size={16} />
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={item._id}
                            className="glass-card"
                            style={styles.itemCard}
                            onClick={() => addToCart(item)}
                          >
                            <div style={styles.itemImageContainer}>
                              {item.image ? (
                                <img src={item.image} alt={item.name} style={styles.itemImage} />
                              ) : (
                                <div style={{...styles.itemImage, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)'}}>
                                  <Package size={24} color="var(--primary-yellow)" />
                                </div>
                              )}
                              <div style={styles.priceBadge}>
                                {item.variants && item.variants.length > 0 ? (
                                  `Rs. ${Math.min(...item.variants.map(v => v.price || 0))}+`
                                ) : (
                                  `Rs. ${item.price}`
                                )}
                              </div>
                            </div>
                            <div style={styles.cardInfo}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                                <h4 style={{ ...styles.itemName, margin: 0 }} title={item.name}>{item.name}</h4>
                                {item.variants && item.variants.length > 0 && (
                                  <span style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--primary-yellow)',
                                    marginTop: '4px',
                                    fontWeight: '700'
                                  }}>
                                    {item.variants.length} Options
                                  </span>
                                )}
                                {isItemLowStock(item, ingredients) && (
                                  <span style={styles.lowStockBadge}>
                                    Low Stock
                                  </span>
                                )}
                              </div>
                              <div style={styles.addBtn}>
                                <Plus size={16} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={styles.emptyState}>
                <Package size={48} />
                <p>No items found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Billing */}
        <div className="glass-card fixed-side-panel" style={styles.billSide}>
          <div style={styles.billHeader}>
            <h3 style={{ fontWeight: '800' }}>Current Bill</h3>
          </div>


          <div style={styles.orderTypeSelector}>
            {['Dine-in', 'Takeaway', 'Delivery'].map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                style={{
                  ...styles.orderTypeBtn,
                  backgroundColor: orderType === type ? 'var(--primary-yellow)' : 'rgba(255, 255, 255, 0.05)',
                  color: orderType === type ? '#000' : 'var(--text-main)',
                  borderColor: orderType === type ? 'var(--primary-yellow)' : 'var(--glass-border)'
                }}
              >
                {type}
              </button>
            ))}
          </div>

          {orderType === 'Delivery' && (
            <div style={styles.customerInfoContainer}>
              <input
                type="text"
                placeholder="Phone (e.g. 0300...)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ ...styles.customerInput, flex: 1, minWidth: 0 }}
              />
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ ...styles.customerInput, flex: 1, minWidth: 0 }}
              />
            </div>
          )}

          <div style={styles.cartItemsList}>
            {cart.length > 0 ? (
              cart.map(item => (
                <div key={item._id} style={styles.cartItem}>
                  <div style={styles.cartItemInfo}>
                    <p style={styles.cartItemName}>{item.name}</p>
                    <p style={styles.cartItemPrice}>Rs. {item.price} x {item.quantity}</p>
                    {/* Nested Deal Items in Card Badge Style */}
                    {item.items && item.items.length > 0 && (
                      <div style={styles.dealItemsContainer}>
                        {item.items.map((di, idx) => (
                          <div key={idx} style={styles.dealItemCard}>
                            <span style={styles.dealItemQty}>{di.quantity}x</span>
                            <span style={styles.dealItemName}>
                              {di.item?.name || 'Item'}
                              {(di.variant || di.chosenVariant) ? ` (${di.variant || di.chosenVariant})` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={styles.qtyControls}>
                    <button onClick={() => updateQuantity(item._id, -1)} style={styles.qtyBtn}><Minus size={14} /></button>
                    <span style={styles.qtyValue}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item._id, 1)} style={styles.qtyBtn}><Plus size={14} /></button>
                    <button onClick={() => removeFromCart(item._id)} style={styles.removeBtn}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            ) : (
              <div style={styles.emptyCart}>
                <ShoppingCart size={32} style={{ opacity: 0.1, marginBottom: '0.5rem' }} />
                <p>Your cart is empty</p>
              </div>
            )}
          </div>

          <div style={styles.billFooter}>
            <div style={styles.billSummary}>
              <div style={styles.summaryRow}>
                <span>Subtotal</span>
                <span>Rs. {total.toFixed(2)}</span>
              </div>
              <div style={{ ...styles.summaryRow, ...styles.totalRow }}>
                <span>Final Amount</span>
                <span>Rs. {total.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <button
                onClick={handleHoldOrderClick}
                style={{ ...styles.printBtn, flex: 1, backgroundColor: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-main)' }}
                disabled={cart.length === 0}
              >
                Hold Bill
              </button>
              <button
                onClick={() => setShowHeldModal(true)}
                style={{ ...styles.printBtn, flex: 1, backgroundColor: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-main)' }}
              >
                Pending Bills ({heldOrders.length})
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleSendToKitchen}
                style={{ ...styles.printBtn, flex: 1, backgroundColor: '#ef4444', color: '#fff', border: 'none' }}
                disabled={cart.length === 0}
              >
                Kitchen Slip
              </button>
              <button
                onClick={() => {
                  setCashReceived(''); // Explicitly empty
                  setShowCheckoutModal(true);
                }}
                style={{ ...styles.printBtn, flex: 1.5 }}
                className="btn-primary"
                disabled={cart.length === 0}
              >
                <Printer size={18} /> Pay & Print
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="print-area" style={styles.printOnly}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <h2>{printType === 'KOT' ? 'KOT - KITCHEN' : 'ANGARA RESTAURANT'}</h2>
          <p>{printType === 'KOT' ? 'Kitchen Order Ticket' : 'Order Summary'}</p>
          <p style={{ fontWeight: 'bold', fontSize: '1.2rem', margin: '0.5rem 0', padding: '0.2rem', border: '1px solid #000' }}>{orderType.toUpperCase()}</p>
          {(orderType === 'Delivery' || orderType === 'Takeaway' || orderType === 'Dine-in') && (
            <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              {customerName && <p>Name: {customerName}</p>}
              {customerPhone && <p>Phone: {customerPhone}</p>}
            </div>
          )}
          <hr />
        </div>
        {cart.map(item => (
          <div key={item._id} style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>{item.quantity}x {item.name}</span>
              {printType === 'RECEIPT' && <span>Rs. {(item.price * item.quantity).toFixed(2)}</span>}
            </div>
            {/* If it's a Deal, list sub-items on receipt */}
            {item.items && item.items.length > 0 && (
              <div style={{ paddingLeft: '1rem', fontSize: '0.85rem', color: '#555', marginTop: '0.15rem' }}>
                {item.items.map((di, idx) => (
                  <div key={idx}>
                    - {di.quantity}x {di.item?.name || 'Item'}{(di.variant || di.chosenVariant) ? ` (${di.variant || di.chosenVariant})` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <hr />
        {printType === 'RECEIPT' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span>Grand Total</span>
            <span>Rs. {total.toFixed(2)}</span>
          </div>
        )}
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          {printType === 'KOT' ? `Time: ${new Date().toLocaleTimeString()}` : 'Thank you for your visit!'}
        </p>
      </div>

      {/* Held Orders Modal */}
      {showHeldModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-card" style={{ width: '500px', maxHeight: '80vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}><Clock size={24} /> Pending Bills ({heldOrders.length})</h2>
              <button onClick={() => setShowHeldModal(false)} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            {heldOrders.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No pending bills right now.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {heldOrders.map(ho => (
                  <div key={ho.id} style={{ border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>{ho.note}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ho.time}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      <span style={{ color: 'var(--primary-yellow)', fontWeight: 'bold' }}>{ho.orderType}</span> • Rs. {ho.total} • {ho.cart.length} items
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleResumeOrder(ho)} style={{ flex: 1, padding: '0.6rem', backgroundColor: 'var(--primary-yellow)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Load Bill</button>
                      <button onClick={() => handleDeleteHoldClick(ho.id)} style={{ padding: '0.6rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hold Bill Prompt Modal */}
      {showHoldPrompt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-card" style={{ width: '400px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: 'var(--text-main)', fontSize: '1.25rem' }}>Hold Bill</h2>
              <button onClick={() => setShowHoldPrompt(false)} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>Enter Table No. or Customer Name (e.g., Table 4, Ali):</p>

            <input
              type="text"
              value={holdNoteInput}
              onChange={(e) => setHoldNoteInput(e.target.value)}
              placeholder="Note / Table No."
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg)', color: 'var(--text-main)', marginBottom: '1.5rem', fontSize: '1rem' }}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && confirmHoldOrder()}
            />

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowHoldPrompt(false)} style={{ flex: 1, padding: '0.8rem', backgroundColor: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button onClick={confirmHoldOrder} style={{ flex: 1, padding: '0.8rem', backgroundColor: 'var(--primary-yellow)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Save Bill</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-card" style={{ width: '400px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '1.5rem', color: '#ef4444' }}>
              <Trash2 size={48} />
            </div>
            <h2 style={{ color: 'var(--text-main)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Delete Pending Bill?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Are you sure you want to permanently delete this parked bill? This action cannot be undone.</p>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: '0.8rem', backgroundColor: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button onClick={confirmDeleteHold} style={{ flex: 1, padding: '0.8rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => !isSubmitting && setShowCheckoutModal(false)}
        total={total}
        cashReceived={cashReceived}
        setCashReceived={setCashReceived}
        onConfirm={handleCheckoutAndPrint}
        isSubmitting={isSubmitting}
      />
      <VariantSelectionModal

        isOpen={showVariantModal}
        onClose={() => setShowVariantModal(false)}
        selectedVariantItem={selectedVariantItem}
        variantQuantities={variantQuantities}
        setVariantQuantities={setVariantQuantities}
        onConfirm={() => {
          let addedAny = false;
          selectedVariantItem.variants.forEach(v => {
            const qty = variantQuantities[v.name] || 0;
            if (qty > 0) {
              addToCart(selectedVariantItem, v, null, qty);
              addedAny = true;
            }
          });
          if (addedAny) {
            setShowVariantModal(false);
            setSelectedVariantItem(null);
            setVariantQuantities({});
          }
        }}
      />

      {/* Deal Variant Selection Modal */}
      <DealVariantSelectionModal
        isOpen={showDealVariantModal}
        onClose={() => setShowDealVariantModal(false)}
        selectedDealForVariants={selectedDealForVariants}
        selectedDealVariants={selectedDealVariants}
        setSelectedDealVariants={setSelectedDealVariants}
        onConfirm={() => {
          addToCart(selectedDealForVariants, null, selectedDealVariants);
          setShowDealVariantModal(false);
          setSelectedDealForVariants(null);
          setSelectedDealVariants({});
        }}
      />
      {/* Custom Alert/Confirm Modal */}
      {alertConfig.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-card" style={{ width: '350px', padding: '1.5rem', textAlign: 'center', border: `1px solid ${alertConfig.type === 'error' ? '#ef4444' : alertConfig.type === 'success' ? '#4ade80' : 'var(--primary-yellow)'}` }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)' }}>{alertConfig.title}</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>{alertConfig.message}</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              {alertConfig.type === 'confirm' ? (
                <>
                  <button onClick={() => setAlertConfig(prev => ({...prev, show: false}))} style={{ flex: 1, padding: '0.6rem', backgroundColor: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                  <button onClick={() => { alertConfig.onConfirm(); setAlertConfig(prev => ({...prev, show: false})); }} style={{ flex: 1, padding: '0.6rem', backgroundColor: 'var(--primary-yellow)', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Confirm</button>
                </>
              ) : (
                <button onClick={() => setAlertConfig(prev => ({...prev, show: false}))} style={{ flex: 1, padding: '0.6rem', backgroundColor: 'var(--primary-yellow)', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>OK</button>
              )}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

const styles = {
  lowStockBadge: {
    padding: '0.15rem 0.4rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--accent-red)',
    borderRadius: '4px',
    fontSize: '0.65rem',
    fontWeight: '700',
    display: 'inline-block',
    marginTop: '4px',
    width: 'fit-content'
  },
  posContainer: {
    display: 'flex',
    gap: '1.25rem',
    height: 'calc(100vh - 120px)',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  menuSide: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    overflow: 'hidden',
    minWidth: 0,
  },
  menuHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    width: '100%',
    minWidth: 0,
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '0.75rem',
    color: 'var(--text-muted)',
  },
  searchInput: {
    width: '100%',
    padding: '0.5rem 1rem 0.5rem 2.25rem',
    borderRadius: '10px',
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-main)',
    fontSize: '0.9rem',
  },
  categoriesScroll: {
    display: 'flex',
    gap: '0.75rem',
    overflowX: 'auto',
    paddingBottom: '0.5rem',
    width: '100%',
    minWidth: 0,
  },
  catTab: {
    padding: '0.45rem 1rem',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    transition: 'all 0.3s ease',
  },
  subCatTab: {
    padding: '0.3rem 0.6rem',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '0.72rem',
    whiteSpace: 'nowrap',
    transition: 'all 0.3s ease',
  },
  subCategoriesScroll: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem',
    marginTop: '0.75rem',
    width: '100%',
    minWidth: 0,
  },
  itemsContainer: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    paddingRight: '0.55rem',
  },
  subCatSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  subCatHeading: {
    fontSize: '0.9rem',
    fontWeight: '800',
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '0.3rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  itemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '0.75rem',
  },
  itemCard: {
    padding: '0.6rem',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    height: '100%',
  },
  itemImageContainer: {
    position: 'relative',
    height: '95px',
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
    marginTop: 'auto',
  },
  dealCardInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.4rem',
  },
  dealTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flex: 1,
  },
  dealItemsText: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: '0.2rem',
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

  billSide: {
    width: '380px',
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem 0.8rem',
    backgroundColor: 'var(--bg-card)',
    height: '100%',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  billHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
    color: 'var(--text-main)',
  },
  orderTypeSelector: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  orderTypeBtn: {
    flex: 1,
    padding: '0.3rem',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '0.75rem',
    fontWeight: '700',
    transition: 'all 0.2s',
  },
  customerInfoContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: '0.4rem',
    marginBottom: '0.3rem',
  },
  customerInput: {
    width: '100%',
    padding: '0.4rem 0.6rem',
    borderRadius: '6px',
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-main)',
    fontSize: '0.8rem',
  },
  cartItemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    marginBottom: '0.75rem',
    boxSizing: 'border-box',
  },
  cartItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0.6rem',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid var(--glass-border)',
  },
  cartItemName: {
    fontWeight: '600',
    fontSize: '0.85rem',
    color: 'var(--text-main)',
  },
  cartItemPrice: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    marginTop: '0.1rem',
  },
  qtyControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  qtyBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    minWidth: '20px',
    textAlign: 'center',
  },
  removeBtn: {
    color: 'var(--accent-red)',
    marginLeft: '0.4rem',
    opacity: 0.7,
  },
  billFooter: {
    borderTop: '1px solid var(--glass-border)',
    paddingTop: '0.75rem',
  },
  billSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    marginBottom: '1rem',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
  },
  totalRow: {
    marginTop: '0.4rem',
    paddingTop: '0.4rem',
    borderTop: '1px dashed var(--glass-border)',
    color: 'var(--text-main)',
    fontSize: '1.1rem',
    fontWeight: '800',
  },
  printBtn: {
    width: '100%',
    padding: '0.4rem',
    gap: '0.4rem',
    fontSize: '0.8rem',
    borderRadius: '10px',
    fontWeight: '700',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  emptyCart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    opacity: 0.5,
    padding: '1rem 0',
  },
  emptyState: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    color: 'var(--text-muted)',
    gap: '1rem',
    opacity: 0.5,
  },
  dealPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250, 204, 21, 0.05)',
  },
  dealItemsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
    marginTop: '0.6rem',
  },
  dealItemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '0.3rem 0.6rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.75rem',
  },
  dealItemQty: {
    color: 'var(--primary-yellow)',
    fontWeight: '700',
  },
  dealItemName: {
    color: 'var(--text-main)',
  },
  whatsappDealCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
  },
  whatsappDealHeader: {
    backgroundColor: '#1c1917',
    color: '#ffffff',
    textAlign: 'center',
    padding: '0.6rem',
    fontWeight: '800',
    fontSize: '0.95rem',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    borderBottom: '2px solid var(--glass-border)',
  },
  whatsappDealItems: {
    padding: '0.8rem 1rem',
    backgroundColor: 'rgba(250, 204, 21, 0.03)',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    minHeight: '80px',
  },
  whatsappDealItemRow: {
    fontSize: '0.8rem',
    color: 'var(--text-main)',
    fontWeight: '600',
    textAlign: 'left',
  },
  whatsappDealImageContainerSmall: {
    aspectRatio: '16/9',
    width: '100%',
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderTop: '1px solid var(--glass-border)',
    borderBottom: '1px solid var(--glass-border)',
  },
  whatsappDealImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  whatsappDealPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250, 204, 21, 0.05)',
  },
  whatsappDealPrice: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    textAlign: 'center',
    padding: '0.6rem',
    fontWeight: '800',
    fontSize: '0.95rem',
    letterSpacing: '0.5px',
  },
  printOnly: {
    display: 'none',
  }
};

export default POS;
