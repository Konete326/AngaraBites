import React from 'react';
import { X } from 'lucide-react';

const DealVariantSelectionModal = ({
  isOpen,
  onClose,
  selectedDealForVariants,
  selectedDealVariants,
  setSelectedDealVariants,
  onConfirm
}) => {
  if (!isOpen || !selectedDealForVariants) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-card" style={{ width: '420px', padding: '1.5rem', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ color: 'var(--text-main)', fontSize: '1.15rem', fontWeight: '800', margin: 0 }}>Select Variants for Deal</h3>
          <button onClick={onClose} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: 0 }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Choose options for the items in <strong style={{ color: 'var(--text-main)' }}>{selectedDealForVariants.name}</strong>:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {selectedDealForVariants.items.map((di, idx) => {
            const hasVariants = di.item && di.item.variants && di.item.variants.length > 0;
            if (!hasVariants) return null;

            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  {di.item.name} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>(Qty: {di.quantity})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {di.item.variants.map((v, vIdx) => {
                    const isSelected = selectedDealVariants[idx]?.name === v.name;
                    return (
                      <label
                        key={vIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.6rem 0.8rem',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--primary-yellow)' : 'var(--glass-border)',
                          backgroundColor: isSelected ? 'rgba(250, 204, 21, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => {
                          setSelectedDealVariants(prev => ({
                            ...prev,
                            [idx]: v
                          }));
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="radio"
                            name={`deal-variant-group-${idx}`}
                            checked={isSelected}
                            onChange={() => {
                              setSelectedDealVariants(prev => ({
                                ...prev,
                                [idx]: v
                              }));
                            }}
                            style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--primary-yellow)' }}
                          />
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>{v.name}</span>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary-yellow)' }}>Rs. {v.price}</span>
                      </label>
                    );
                  })}
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
          >
            Confirm Options
          </button>
        </div>
      </div>
    </div>
  );
};

export default DealVariantSelectionModal;
