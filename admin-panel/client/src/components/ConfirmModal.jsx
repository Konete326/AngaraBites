import React from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', disabled = false }) => {
  const [loading, setLoading] = React.useState(false);
  const isSubmittingRef = React.useRef(false);

  if (!isOpen) return null;

  const handleConfirmClick = async () => {
    if (disabled || loading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const res = onConfirm();
      if (res instanceof Promise) {
        await res;
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const isBtnDisabled = disabled || loading;

  return createPortal(
    <div style={styles.modalOverlay}>
      <div className="modal-card" style={styles.modal}>
        <div style={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle color="var(--primary-yellow)" size={24} />
            <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.25rem' }}>
              {title || 'Confirm Action'}
            </h3>
          </div>
          <button onClick={onClose} disabled={isBtnDisabled} style={{ ...styles.closeBtn, cursor: isBtnDisabled ? 'not-allowed' : 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        
        <div style={styles.modalBody}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.5' }}>
            {message || 'Are you sure you want to proceed?'}
          </p>
        </div>

        <div style={styles.modalFooter}>
          {cancelText && (
            <button onClick={onClose} disabled={isBtnDisabled} style={{ ...styles.cancelBtn, opacity: isBtnDisabled ? 0.6 : 1, cursor: isBtnDisabled ? 'not-allowed' : 'pointer' }}>
              {cancelText}
            </button>
          )}
          <button onClick={handleConfirmClick} disabled={isBtnDisabled} style={{ ...styles.confirmBtn, opacity: isBtnDisabled ? 0.6 : 1, cursor: isBtnDisabled ? 'not-allowed' : 'pointer' }}>
            {isBtnDisabled ? 'Loading...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
  },
  modal: {
    width: '90%',
    maxWidth: '400px',
    padding: '1.5rem',
    backgroundColor: 'var(--bg-card)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  modalBody: {
    marginBottom: '1.5rem',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
  },
  closeBtn: { 
    color: 'var(--text-muted)',
    transition: 'color 0.2s ease',
  },
  cancelBtn: {
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    backgroundColor: 'transparent',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-main)',
    fontWeight: '600',
    transition: 'background-color 0.2s ease',
  },
  confirmBtn: {
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    backgroundColor: 'var(--accent-red)',
    color: '#fff',
    border: 'none',
    fontWeight: '600',
    transition: 'opacity 0.2s ease',
  }
};

export default ConfirmModal;
