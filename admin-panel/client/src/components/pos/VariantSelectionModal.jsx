import React from 'react';
import { X, Plus, Minus } from 'lucide-react';

const VariantSelectionModal = ({
  isOpen,
  onClose,
  selectedVariantItem,
  variantQuantities,
  setVariantQuantities,
  onConfirm
}) => {
  if (!isOpen || !selectedVariantItem) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-card" style={{ width: '380px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ color: 'var(--text-main)', fontSize: '1.15rem', fontWeight: '800', margin: 0 }}>Select Variant / Option</h3>
          <button onClick={onClose} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: 0 }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Choose quantities for <strong style={{ color: 'var(--text-main)' }}>{selectedVariantItem.name}</strong> options:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {selectedVariantItem.variants.map((v, idx) => {
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
                  backgroundColor: qty > 0 ? 'rgba(250, 204, 21, 0.05)' : 'rgba(255, 255, 255, 0.02)',
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
            onClick={onClose}
            style={{ flex: 1, padding: '0.75rem', backgroundColor: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 2, padding: '0.75rem', backgroundColor: 'var(--primary-yellow)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            disabled={!Object.values(variantQuantities).some(q => q > 0)}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariantSelectionModal;
