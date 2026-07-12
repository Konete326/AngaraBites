import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusCircle, X, Upload, Package, Save, Tag, Layers, Flame } from 'lucide-react';
import { Spinner } from '../ui/spinner-1';
import imageCompression from 'browser-image-compression';
import { useData } from '../../context/DataContext';
import { getApiUrl } from '../../utils/api';


const ItemCreatorModal = ({ isOpen, onClose, itemToEdit, categories, refreshData }) => {
  const { ingredients } = useData();
  const [trackingMode, setTrackingMode] = useState('none');
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    subCategory: '',
    kitchenType: 'Fast Food',
    priceType: 'single',
    price: '',
    variants: [],
    spiceLevel: false,
    addons: [],
    image: null,
    isAvailable: true,
    trackDirectStock: false,
    stockQuantity: '',
    lowStockThreshold: '5',
    recipe: []
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddRecipeIngredient = () => {
    setFormData(prev => ({
      ...prev,
      recipe: [...prev.recipe, { ingredientId: '', quantityRequired: '' }]
    }));
  };

  const handleRecipeChange = (index, field, value) => {
    const newRecipe = [...formData.recipe];
    newRecipe[index][field] = value;
    setFormData(prev => ({ ...prev, recipe: newRecipe }));
  };

  const handleRemoveRecipeIngredient = (index) => {
    const newRecipe = [...formData.recipe];
    newRecipe.splice(index, 1);
    setFormData(prev => ({ ...prev, recipe: newRecipe }));
  };

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        let mode = 'none';
        if (itemToEdit.trackDirectStock) {
          mode = 'direct';
        } else if (itemToEdit.recipe && itemToEdit.recipe.length > 0) {
          mode = 'recipe';
        }
        setTrackingMode(mode);
        setFormData({
          name: itemToEdit.name,
          category: itemToEdit.category?._id || '',
          subCategory: itemToEdit.subCategory || '',
          kitchenType: itemToEdit.kitchenType || 'Fast Food',
          priceType: itemToEdit.priceType || 'single',
          price: itemToEdit.price || '',
          variants: itemToEdit.variants || [],
          spiceLevel: itemToEdit.spiceLevel || false,
          addons: itemToEdit.addons || [],
          image: null,
          isAvailable: itemToEdit.isAvailable !== undefined ? itemToEdit.isAvailable : true,
          trackDirectStock: itemToEdit.trackDirectStock || false,
          stockQuantity: itemToEdit.stockQuantity !== undefined ? String(itemToEdit.stockQuantity) : '',
          lowStockThreshold: itemToEdit.lowStockThreshold !== undefined ? String(itemToEdit.lowStockThreshold) : '5',
          recipe: itemToEdit.recipe || []
        });
        setImagePreview(itemToEdit.image);
      } else {
        setTrackingMode('none');
        setFormData({ 
          name: '', category: '', subCategory: '', kitchenType: 'Fast Food', priceType: 'single', 
          price: '', variants: [], spiceLevel: false, addons: [], image: null, isAvailable: true,
          trackDirectStock: false, stockQuantity: '', lowStockThreshold: '5', recipe: []
        });
        setImagePreview(null);
      }
    }
  }, [isOpen, itemToEdit]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'category') {
      setFormData({ ...formData, [name]: value, subCategory: '' });
    } else {
      setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsCompressing(true);
      try {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1024,
          useWebWorker: true
        };
        const compressedFile = await imageCompression(file, options);
        setFormData({ ...formData, image: compressedFile });
        setImagePreview(URL.createObjectURL(compressedFile));
      } catch (error) {
        console.error('Error compressing image:', error);
        alert('Error compressing image. Please try another.');
      }
      setIsCompressing(false);
    }
  };

  const handleAddVariant = () => {
    setFormData({ ...formData, variants: [...formData.variants, { name: '', price: '' }] });
  };
  const handleVariantChange = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    setFormData({ ...formData, variants: newVariants });
  };
  const handleRemoveVariant = (index) => {
    const newVariants = [...formData.variants];
    newVariants.splice(index, 1);
    setFormData({ ...formData, variants: newVariants });
  };

  const handleAddAddon = () => {
    setFormData({ ...formData, addons: [...formData.addons, { name: '', price: '' }] });
  };
  const handleAddonChange = (index, field, value) => {
    const newAddons = [...formData.addons];
    newAddons[index][field] = value;
    setFormData({ ...formData, addons: newAddons });
  };
  const handleRemoveAddon = (index) => {
    const newAddons = [...formData.addons];
    newAddons.splice(index, 1);
    setFormData({ ...formData, addons: newAddons });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(isCompressing) return alert('Wait for image compression to finish!');
    if(isSubmitting) return;
    
    setIsSubmitting(true);
    const data = new FormData();
    data.append('name', formData.name);
    data.append('category', formData.category);
    data.append('subCategory', formData.subCategory);
    data.append('kitchenType', formData.kitchenType);
    data.append('priceType', formData.priceType);
    data.append('price', formData.price);
    data.append('spiceLevel', formData.spiceLevel);
    data.append('variants', JSON.stringify(formData.variants));
    data.append('addons', JSON.stringify(formData.addons));
    data.append('isAvailable', formData.isAvailable);

    const isDirect = trackingMode === 'direct';
    const isRecipe = trackingMode === 'recipe';
    data.append('trackDirectStock', isDirect);
    data.append('stockQuantity', isDirect ? (formData.stockQuantity || 0) : 0);
    data.append('lowStockThreshold', isDirect ? (formData.lowStockThreshold || 5) : 5);
    data.append('recipe', isRecipe ? JSON.stringify(formData.recipe.filter(r => r.ingredientId && r.quantityRequired)) : JSON.stringify([]));

    if (formData.image) {
      data.append('image', formData.image);
    }

    try {
      if (itemToEdit) {
        await axios.put(getApiUrl(`/api/items/${itemToEdit._id}`), data);
      } else {
        await axios.post(getApiUrl('/api/items'), data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      refreshData();

      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = !!itemToEdit;
  const resetForm = onClose;

  const selectedCategoryObj = categories.find(c => c._id === formData.category);
  const hasSubCategories = selectedCategoryObj && selectedCategoryObj.subCategories && selectedCategoryObj.subCategories.length > 0;

  return (
    <div style={styles.modalOverlay}>
      <div className="modal-card" style={styles.modal}>
        <div style={styles.modalHeader}>
          <h3>{isEditing ? 'Edit Item' : 'Add New Item'}</h3>
          <button onClick={resetForm} style={styles.closeBtn}><X /></button>
        </div>

        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '1rem'}}>
          
          {/* Section 1 */}
          <div style={styles.formSectionCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionNumber}>1</div>
              <h4 style={styles.sectionTitleText}>Basic Information</h4>
            </div>
            <div style={styles.formGrid}>
              <div style={styles.formLeft}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Item Name</label>
                  <input 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    placeholder="e.g. Chicken Karahi"
                    style={styles.input}
                    required 
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Kitchen Section</label>
                  <select 
                    name="kitchenType" 
                    value={formData.kitchenType} 
                    onChange={handleInputChange} 
                    style={styles.input}
                    required
                  >
                    <option value="Fast Food">Fast Food</option>
                    <option value="BBQ">BBQ / Desi</option>
                    <option value="Drinks/Extras">Drinks / Extras</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Category</label>
                  <select 
                    name="category" 
                    value={formData.category} 
                    onChange={handleInputChange} 
                    style={styles.input}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {hasSubCategories && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Sub Category</label>
                    <select 
                      name="subCategory" 
                      value={formData.subCategory} 
                      onChange={handleInputChange} 
                      style={styles.input}
                      required
                    >
                      <option value="">Select Sub Category</option>
                      {selectedCategoryObj.subCategories.map((sub, idx) => (
                        <option key={idx} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{...styles.formGroup, marginTop: '0.5rem'}}>
                  <label style={styles.toggleLabel}>
                    <div style={{...styles.toggleSwitch, ...(formData.isAvailable ? styles.toggleSwitchActive : {})}}>
                       <div style={{...styles.toggleThumb, ...(formData.isAvailable ? styles.toggleThumbActive : {})}} />
                    </div>
                    <input 
                      type="checkbox" 
                      name="isAvailable"
                      checked={formData.isAvailable} 
                      onChange={handleInputChange}
                      style={{display: 'none'}}
                    />
                    <span style={{fontWeight: '600', color: 'var(--text-main)'}}>Item is Available (In Stock)</span>
                  </label>
                </div>

              </div>

              <div style={styles.formRight}>
                <label style={styles.label}>Item Image <span style={{fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal'}}>(Optional)</span></label>
                <div style={styles.uploadArea} onClick={() => document.getElementById('imageInput').click()}>
                  {isCompressing ? (
                     <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'}}>
                       <Spinner size={24} color="var(--primary-yellow)" />
                       <span>Compressing...</span>
                     </div>
                  ) : imagePreview ? (
                    <div style={styles.previewContainer}>
                       <img src={imagePreview} alt="Preview" style={styles.previewImg} />
                       <div style={styles.changeImageOverlay}><span>Change Image</span></div>
                    </div>
                  ) : (
                    <div style={styles.uploadPlaceholder}>
                      <div style={styles.uploadIconWrapper}><Upload size={24} color="var(--primary-yellow)" /></div>
                      <span style={styles.uploadTextMain}>Click to upload</span>
                      <span style={styles.uploadTextSub}>(Auto-compressed)</span>
                    </div>
                  )}
                  <input 
                    id="imageInput" 
                    type="file" 
                    onChange={handleImageChange} 
                    hidden 
                    accept="image/*"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div style={styles.formSectionCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionNumber}>2</div>
              <h4 style={styles.sectionTitleText}>Pricing & Portions</h4>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Price Type</label>
              <div style={styles.priceTypeContainer}>
                <label style={{...styles.priceTypeCard, ...(formData.priceType === 'single' ? styles.priceTypeCardActive : {})}}>
                  <input 
                    type="radio" 
                    name="priceType" 
                    value="single" 
                    checked={formData.priceType === 'single'} 
                    onChange={handleInputChange} 
                    style={{display: 'none'}}
                  />
                  <div style={{...styles.priceTypeIconWrapper, ...(formData.priceType === 'single' ? styles.iconActive : {})}}><Tag size={18} /></div>
                  <div style={styles.priceTypeText}>
                    <span style={styles.priceTypeTitle}>Single Price</span>
                    <span style={styles.priceTypeSub}>(e.g. Burger)</span>
                  </div>
                </label>
                <label style={{...styles.priceTypeCard, ...(formData.priceType === 'variants' ? styles.priceTypeCardActive : {})}}>
                  <input 
                    type="radio" 
                    name="priceType" 
                    value="variants" 
                    checked={formData.priceType === 'variants'} 
                    onChange={handleInputChange} 
                    style={{display: 'none'}}
                  />
                  <div style={{...styles.priceTypeIconWrapper, ...(formData.priceType === 'variants' ? styles.iconActive : {})}}><Layers size={18} /></div>
                  <div style={styles.priceTypeText}>
                    <span style={styles.priceTypeTitle}>Multiple Portions</span>
                    <span style={styles.priceTypeSub}>(e.g. Half/Full/KG)</span>
                  </div>
                </label>
              </div>
            </div>

            {formData.priceType === 'single' ? (
              <div style={{...styles.formGroup, width: '50%', marginTop: '1rem'}}>
                <label style={styles.label}>Item Price (Rs.)</label>
                <div style={styles.priceInputWrapper}>
                  <span style={styles.currencyPrefix}>Rs.</span>
                  <input 
                    type="number" 
                    name="price" 
                    value={formData.price} 
                    onChange={handleInputChange} 
                    placeholder="e.g. 350"
                    style={{...styles.input, paddingLeft: '3rem'}}
                  />
                </div>
              </div>
            ) : (
              <div style={styles.variantsContainer}>
                <label style={styles.label}>Define Portions/Variants</label>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem'}}>
                  {formData.variants.map((variant, index) => (
                    <div key={index} style={styles.dynamicRow}>
                      <input 
                        placeholder="Portion Name (e.g. Half)" 
                        value={variant.name} 
                        onChange={(e) => handleVariantChange(index, 'name', e.target.value)} 
                        style={{ ...styles.input, flex: 2 }}
                        required
                      />
                      <div style={{...styles.priceInputWrapper, flex: 1.5}}>
                         <span style={styles.currencyPrefix}>Rs.</span>
                         <input 
                           placeholder="Price" 
                           type="number" 
                           value={variant.price} 
                           onChange={(e) => handleVariantChange(index, 'price', e.target.value)} 
                           style={{ ...styles.input, paddingLeft: '3rem', width: '100%' }}
                           required
                         />
                      </div>
                      <button type="button" onClick={() => handleRemoveVariant(index)} style={styles.removeBtn}><X size={18} /></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={handleAddVariant} style={styles.addBtn}>
                  <PlusCircle size={16} /> Add Variant
                </button>
              </div>
            )}
          </div>

          {/* Section 3 */}
          <div style={styles.formSectionCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionNumber}>3</div>
              <h4 style={styles.sectionTitleText}>Extras & Sides</h4>
            </div>
            
            <div style={{...styles.spiceLevelCard, ...(formData.spiceLevel ? styles.spiceLevelCardActive : {})}}>
              <div style={styles.spiceLevelInfo}>
                <div style={styles.spiceLevelIconWrapper}><Flame size={20} color={formData.spiceLevel ? "#fff" : "var(--accent-red)"} /></div>
                <div>
                   <span style={{fontWeight: '700', color: formData.spiceLevel ? '#fff' : 'var(--text-main)', display: 'block', marginBottom: '4px'}}>Ask for Spice Level?</span>
                   <span style={{fontSize: '0.85rem', color: formData.spiceLevel ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'}}>If enabled, customers will be asked to choose Mild, Normal, Spicy, or Extra Spicy.</span>
                </div>
              </div>
              <label style={styles.toggleLabel}>
                <div style={{...styles.toggleSwitch, ...(formData.spiceLevel ? styles.toggleSwitchActive : {})}}>
                   <div style={{...styles.toggleThumb, ...(formData.spiceLevel ? styles.toggleThumbActive : {})}} />
                </div>
                <input 
                  type="checkbox" 
                  name="spiceLevel"
                  checked={formData.spiceLevel} 
                  onChange={handleInputChange}
                  style={{display: 'none'}}
                />
              </label>
            </div>

            <div style={{marginTop: '1.5rem'}}>
              <label style={styles.label}>Extras / Sides (e.g. Raita, Extra Cheese)</label>
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem'}}>
                {formData.addons.map((addon, index) => (
                  <div key={index} style={styles.dynamicRow}>
                    <input 
                      placeholder="Extra/Side Name" 
                      value={addon.name} 
                      onChange={(e) => handleAddonChange(index, 'name', e.target.value)} 
                      style={{ ...styles.input, flex: 2 }}
                      required
                    />
                    <div style={{...styles.priceInputWrapper, flex: 1.5}}>
                       <span style={styles.currencyPrefix}>Rs.</span>
                       <input 
                         placeholder="Price" 
                         type="number" 
                         value={addon.price} 
                         onChange={(e) => handleAddonChange(index, 'price', e.target.value)} 
                         style={{ ...styles.input, paddingLeft: '3rem', width: '100%' }}
                         required
                       />
                    </div>
                    <button type="button" onClick={() => handleRemoveAddon(index)} style={styles.removeBtn}><X size={18} /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleAddAddon} style={styles.addBtn}>
                <PlusCircle size={16} /> Add Extra/Side
              </button>
            </div>
          </div>

          <div style={styles.formSectionCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionNumber}>4</div>
              <h4 style={styles.sectionTitleText}>Inventory & Recipes</h4>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Inventory Tracking Mode</label>
              <select
                value={trackingMode}
                onChange={(e) => setTrackingMode(e.target.value)}
                style={styles.input}
              >
                <option value="none">No Stock Tracking</option>
                <option value="direct">Direct Stock (Packaged Drinks / Desserts)</option>
                <option value="recipe">Recipe-Based (Deducts Raw Ingredients on Sale)</option>
              </select>
            </div>

            {trackingMode === 'direct' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Stock Quantity</label>
                  <input
                    type="number"
                    name="stockQuantity"
                    value={formData.stockQuantity}
                    onChange={handleInputChange}
                    placeholder="e.g. 50"
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Low Stock Limit</label>
                  <input
                    type="number"
                    name="lowStockThreshold"
                    value={formData.lowStockThreshold}
                    onChange={handleInputChange}
                    placeholder="e.g. 5"
                    style={styles.input}
                    required
                  />
                </div>
              </div>
            )}

            {trackingMode === 'recipe' && (
              <div style={{ marginTop: '1rem' }}>
                <label style={styles.label}>Recipe Ingredients</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                  {formData.recipe.map((element, index) => {
                    const selectedIng = ingredients.find(ing => ing._id === element.ingredientId);
                    return (
                      <div key={index} style={styles.dynamicRow}>
                        <select
                          value={element.ingredientId}
                          onChange={(e) => handleRecipeChange(index, 'ingredientId', e.target.value)}
                          style={{ ...styles.input, flex: 2 }}
                          required
                        >
                          <option value="">Select Raw Material</option>
                          {ingredients.map(ing => (
                            <option key={ing._id} value={ing._id}>{ing.name}</option>
                          ))}
                        </select>
                        <div style={{ ...styles.priceInputWrapper, flex: 1.5 }}>
                          <input
                            placeholder="Qty"
                            type="number"
                            step="any"
                            value={element.quantityRequired}
                            onChange={(e) => handleRecipeChange(index, 'quantityRequired', e.target.value)}
                            style={{ ...styles.input, width: '100%' }}
                            required
                          />
                          {selectedIng && (
                            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {selectedIng.unit}
                            </span>
                          )}
                        </div>
                        <button type="button" onClick={() => handleRemoveRecipeIngredient(index)} style={styles.removeBtn}><X size={18} /></button>
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={handleAddRecipeIngredient} style={styles.addBtn}>
                  <PlusCircle size={16} /> Add Recipe Ingredient
                </button>
              </div>
            )}
          </div>

          <div style={styles.formActions}>
            <button type="button" className="btn-secondary" disabled={isSubmitting} onClick={resetForm}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isCompressing || isSubmitting} style={{padding: '0.8rem 2rem', fontSize: '1rem', fontWeight: 'bold'}}>
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update Item' : 'Save Item')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

const styles = {
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

export default ItemCreatorModal;
