import React from 'react';
import { X, Package, Tag } from 'lucide-react';

const DealViewerModal = ({ isOpen, onClose, deal }) => {
  if (!isOpen || !deal) return null;

  return (
    <div style={styles.modalOverlay}>
      <div className="modal-card" style={styles.modal}>
        <div style={styles.modalHeader}>
          <h3>Deal Details</h3>
          <button onClick={onClose} style={styles.closeBtn}><X /></button>
        </div>

        <div style={styles.content}>
          <div style={styles.imageContainer}>
            {deal.image ? (
              <img src={deal.image} alt={deal.name} style={styles.image} />
            ) : (
              <div style={styles.placeholder}>
                <Tag size={64} style={{ opacity: 0.5, color: 'var(--primary-yellow)' }} />
              </div>
            )}
            <div style={styles.pricePatchOverlay}>Rs {deal.price}</div>
          </div>
          
          <div style={styles.infoContainer}>
            <h2 style={styles.dealName}>{deal.name}</h2>
            {deal.description && <p style={styles.description}>{deal.description}</p>}
          </div>

          <div style={styles.itemsSection}>
            <div style={styles.sectionHeader}>
              <Package size={20} color="var(--primary-yellow)" />
              <h4 style={styles.sectionTitle}>Included Items</h4>
            </div>
            <div style={styles.itemsList}>
              {deal.items?.map((di, idx) => (
                <div key={idx} style={styles.itemRow}>
                  <div style={styles.itemQuantityWrapper}>
                    <span style={styles.itemQuantity}>{di.quantity}x</span>
                  </div>
                  <div style={styles.itemDetails}>
                    <span style={styles.itemName}>{di.item?.name || 'Deleted Item'}</span>
                    {di.item?.category?.name && (
                      <span style={styles.itemCategory}>{di.item.category.name}</span>
                    )}
                  </div>
                  {di.item?.image ? (
                    <img src={di.item.image} alt="item" style={styles.miniItemImage} />
                  ) : (
                    <div style={{...styles.miniItemImage, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)'}}>
                      <Package size={20} color="var(--primary-yellow)" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
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
    maxWidth: '500px',
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
    marginBottom: '1.5rem',
    color: 'var(--text-main)',
  },
  closeBtn: {
    color: 'var(--text-muted)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.4rem',
    borderRadius: '50%',
    transition: 'background-color 0.2s',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16/9',
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
    boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--glass)',
  },
  pricePatchOverlay: {
    position: 'absolute',
    bottom: '1rem',
    right: '1rem',
    backgroundColor: 'var(--primary-yellow)',
    color: '#000',
    padding: '0.5rem 1rem',
    borderRadius: '10px',
    fontWeight: '900',
    fontSize: '1.2rem',
    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
  },
  infoContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    alignItems: 'center',
    textAlign: 'center',
  },
  dealName: {
    fontSize: '1.6rem',
    fontWeight: '800',
    color: 'var(--text-main)',
    margin: 0,
  },
  description: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    margin: 0,
  },
  itemsSection: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--glass-border)',
    borderRadius: '16px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '0.8rem',
  },
  sectionTitle: {
    color: 'var(--text-main)',
    fontSize: '1.1rem',
    fontWeight: '700',
    margin: 0,
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.03)',
  },
  itemQuantityWrapper: {
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    color: 'var(--primary-yellow)',
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '1rem',
  },
  itemDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  itemName: {
    color: 'var(--text-main)',
    fontWeight: '600',
    fontSize: '0.95rem',
  },
  itemCategory: {
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  miniItemImage: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    objectFit: 'cover',
    border: '1px solid var(--glass-border)',
  }
};

export default DealViewerModal;
