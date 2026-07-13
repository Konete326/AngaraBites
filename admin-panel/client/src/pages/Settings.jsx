import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { getApiUrl } from '../utils/api';
import printLogoImg from '../assets/printlogo.jpeg';
import { Spinner } from '../components/ui/spinner-1';
import ConfirmModal from '../components/ConfirmModal';
import LogsConsole from '../components/settings/LogsConsole';
import { 
  Save, 
  Printer, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Store, 
  Database,
  Trash2,
  Info,
  Upload,
  ImageIcon,
  FileText,
  Search,
  Terminal
} from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('printer');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  
  const [config, setConfig] = useState({
    type: 'auto',
    name: '',
    host: '',
    port: '9100',
    width: 36
  });

  const [storeConfig, setStoreConfig] = useState({
    storeName: '',
    phone: '',
    footerNote: '',
    logoUrl: ''
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(printLogoImg);
  const [logoUploading, setLogoUploading] = useState(false);
  const [showSaveProfileConfirm, setShowSaveProfileConfirm] = useState(false);
  const logoInputRef = useRef(null);

  const [dbStats, setDbStats] = useState({
    totalSales: 0,
    totalExpenses: 0
  });

  const [showResetSelectModal, setShowResetSelectModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [resetType, setResetType] = useState('sales');
  const [password, setPassword] = useState('');
  const [notification, setNotification] = useState(null);
  const [previewLines, setPreviewLines] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showReceiptTypeModal, setShowReceiptTypeModal] = useState(false);
  const [showDeleteLogoConfirm, setShowDeleteLogoConfirm] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewWidth, setPreviewWidth] = useState(36);

  const triggerPreview = async (type) => {
    try {
      const res = await axios.get(getApiUrl('/api/print/preview'), {
        params: {
          type,
          storeName: storeConfig.storeName,
          phone: storeConfig.phone,
          footerNote: storeConfig.footerNote,
          width: config.width
        }
      });
      setPreviewLines(res.data.lines);
      setPreviewWidth(res.data.width || config.width);
      setPreviewTitle(
        type === 'CUSTOMER_RECEIPT_SIMPLE' ? 'Customer Receipt (Takeaway)' :
        type === 'CUSTOMER_RECEIPT_DELIVERY' ? 'Customer Receipt (Delivery)' :
        type === 'KOT_DESI' ? 'KOT Desi Kitchen' : 'KOT Fast Food'
      );
      setShowPreviewModal(true);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to load preview.' });
    }
  };

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await axios.get(getApiUrl('/api/print/status'));
      setStatus(res.data);
      if (res.data.type === 'tcp') {
        const [host, port] = (res.data.printer || '').split(':');
        setConfig({
          type: 'tcp',
          host: host || '',
          port: port || '9100',
          name: '',
          width: res.data.width || 36
        });
      } else if (res.data.type === 'windows') {
        setConfig({
          type: 'windows',
          name: res.data.printer || '',
          host: '',
          port: '9100',
          width: res.data.width || 36
        });
      } else if (res.data.type === 'browser') {
        setConfig({
          type: 'browser',
          name: '',
          host: '',
          port: '9100',
          width: res.data.width || 36
        });
      } else {
        setConfig({
          type: 'auto',
          name: '',
          host: '',
          port: '9100',
          width: res.data.width || 36
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreConfig = async () => {
    try {
      const res = await axios.get(getApiUrl('/api/print/store-config'));
      setStoreConfig(res.data);
      if (res.data.logoUrl) {
        setLogoPreview(res.data.logoUrl);
      } else {
        setLogoPreview(printLogoImg);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDbStats = async () => {
    try {
      const res = await axios.get(getApiUrl('/api/dashboard/db-stats'));
      setDbStats({
        totalSales: res.data.totalSales,
        totalExpenses: res.data.totalExpenses
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchStoreConfig();
    fetchDbStats();
  }, []);

  const handleSavePrinter = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);
    try {
      const payload = {
        type: config.type,
        name: config.name,
        host: config.host,
        port: config.port,
        width: config.width
      };
      await axios.post(getApiUrl('/api/print/config'), payload);
      setNotification({ type: 'success', message: 'Printer configuration saved successfully!' });
      await fetchStatus();
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStore = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setNotification(null);
    setShowSaveProfileConfirm(false);
    try {
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        await axios.post(getApiUrl('/api/print/logo'), formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setLogoFile(null);
        if (logoInputRef.current) logoInputRef.current.value = '';
      }

      await axios.post(getApiUrl('/api/print/store-config'), {
        storeName: storeConfig.storeName,
        phone: storeConfig.phone,
        footerNote: storeConfig.footerNote
      });
      setNotification({ type: 'success', message: 'Store profile and logo saved successfully! Changes are now active for all printouts.' });
      await fetchStoreConfig();
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to save store profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setLogoUploading(true);
    setNotification(null);
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      const res = await axios.post(getApiUrl('/api/print/logo'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStoreConfig(prev => ({ ...prev, logoUrl: res.data.logoUrl }));
      setLogoPreview(res.data.logoUrl);
      setLogoFile(null);
      if (logoInputRef.current) logoInputRef.current.value = '';
      setNotification({ type: 'success', message: 'Logo uploaded! Real printouts will now use the new logo.' });
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Logo upload failed. Please try again.' });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoDelete = async () => {
    setLogoUploading(true);
    setNotification(null);
    try {
      await axios.delete(getApiUrl('/api/print/logo'));
      setLogoFile(null);
      if (logoInputRef.current) logoInputRef.current.value = '';
      setNotification({ type: 'success', message: 'Custom logo removed successfully!' });
      await fetchStoreConfig();
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to delete logo.' });
    } finally {
      setLogoUploading(false);
      setShowDeleteLogoConfirm(false);
    }
  };

  const handleResetDatabase = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setNotification(null);
    try {
      const userObj = JSON.parse(localStorage.getItem('user') || '{}');
      const email = userObj.email || 'admin@gmail.com';
      const verifyRes = await axios.post(getApiUrl('/api/auth/verify-password'), {
        email,
        password
      });
      if (verifyRes.data.success) {
        if (resetType === 'sales' || resetType === 'both') {
          await axios.delete(getApiUrl('/api/sales'));
        }
        if (resetType === 'expenses' || resetType === 'both') {
          await axios.delete(getApiUrl('/api/expenses'));
        }
        setNotification({
          type: 'success',
          message: 'Database reset completed successfully.'
        });
        await fetchDbStats();
        setPassword('');
        setShowPasswordModal(false);
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Password verification failed. Reset aborted.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div style={styles.container}>
        
        <div className="glass-card" style={styles.headerRow}>
          <div style={styles.headerContent}>
            <div>
              <h2 style={styles.headerTitle}>System Configurations</h2>
              <p style={styles.headerSubtitle}>Manage printer routing, print logos, and restaurant details.</p>
            </div>
            <button onClick={() => { fetchStatus(); fetchStoreConfig(); fetchDbStats(); }} style={styles.refreshBtn}>
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        <div style={styles.gridRow}>
          <button 
            onClick={() => { setActiveTab('printer'); setNotification(null); }}
            style={{
              ...styles.gridItem,
              borderBottom: activeTab === 'printer' ? '3px solid var(--primary-yellow)' : '1px solid var(--glass-border)',
              backgroundColor: activeTab === 'printer' ? 'rgba(255, 255, 255, 0.03)' : 'transparent'
            }}
          >
            <Printer size={20} color={activeTab === 'printer' ? 'var(--primary-yellow)' : 'var(--text-muted)'} />
            <div style={styles.gridTextContainer}>
              <span style={{ ...styles.gridTitle, color: activeTab === 'printer' ? 'var(--text-main)' : 'var(--text-muted)' }}>Printer Setup</span>
              <span style={styles.gridSubtitle}>Configure ticket printers</span>
            </div>
          </button>

          <button 
            onClick={() => { setActiveTab('profile'); setNotification(null); }}
            style={{
              ...styles.gridItem,
              borderBottom: activeTab === 'profile' ? '3px solid var(--primary-yellow)' : '1px solid var(--glass-border)',
              backgroundColor: activeTab === 'profile' ? 'rgba(255, 255, 255, 0.03)' : 'transparent'
            }}
          >
            <Store size={20} color={activeTab === 'profile' ? 'var(--primary-yellow)' : 'var(--text-muted)'} />
            <div style={styles.gridTextContainer}>
              <span style={{ ...styles.gridTitle, color: activeTab === 'profile' ? 'var(--text-main)' : 'var(--text-muted)' }}>Store Profile</span>
              <span style={styles.gridSubtitle}>Customize receipt header/footer</span>
            </div>
          </button>

          <button 
            onClick={() => { setActiveTab('database'); setNotification(null); }}
            style={{
              ...styles.gridItem,
              borderBottom: activeTab === 'database' ? '3px solid var(--primary-yellow)' : '1px solid var(--glass-border)',
              backgroundColor: activeTab === 'database' ? 'rgba(255, 255, 255, 0.03)' : 'transparent'
            }}
          >
            <Database size={20} color={activeTab === 'database' ? 'var(--primary-yellow)' : 'var(--text-muted)'} />
            <div style={styles.gridTextContainer}>
              <span style={{ ...styles.gridTitle, color: activeTab === 'database' ? 'var(--text-main)' : 'var(--text-muted)' }}>Database Utilities</span>
              <span style={styles.gridSubtitle}>Clean records & view stats</span>
            </div>
          </button>

          <button 
            onClick={() => { setActiveTab('logs'); setNotification(null); }}
            style={{
              ...styles.gridItem,
              borderBottom: activeTab === 'logs' ? '3px solid var(--primary-yellow)' : '1px solid var(--glass-border)',
              backgroundColor: activeTab === 'logs' ? 'rgba(255, 255, 255, 0.03)' : 'transparent'
            }}
          >
            <FileText size={20} color={activeTab === 'logs' ? 'var(--primary-yellow)' : 'var(--text-muted)'} />
            <div style={styles.gridTextContainer}>
              <span style={{ ...styles.gridTitle, color: activeTab === 'logs' ? 'var(--text-main)' : 'var(--text-muted)' }}>System Logs</span>
              <span style={styles.gridSubtitle}>Console errors & warnings</span>
            </div>
          </button>
        </div>

        {notification && (
          <div style={{
            ...styles.notification,
            backgroundColor: notification.type === 'success' ? 'rgba(74, 222, 128, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            borderColor: notification.type === 'success' ? '#4ade80' : '#ef4444',
            color: notification.type === 'success' ? '#4ade80' : '#ef4444',
            maxWidth: '100%'
          }}>
            {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{notification.message}</span>
          </div>
        )}

        <div style={styles.sectionRowContainer}>
          {activeTab === 'logs' ? (
            <LogsConsole setGlobalNotification={setNotification} />
          ) : (
            <>
              <div className="glass-card" style={styles.sectionRowLeft}>
                {loading ? (
                  <div style={styles.spinnerContainer}>
                    <Spinner />
                  </div>
                ) : (
                  activeTab === 'printer' ? (
                    <form onSubmit={handleSavePrinter} style={styles.form}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Connection Type</label>
                        <select
                          value={config.type}
                          onChange={(e) => setConfig({ ...config, type: e.target.value })}
                          style={styles.select}
                          required
                        >
                          <option value="auto">Auto Detect (Default OS Printer)</option>
                          <option value="windows">Windows Printer Name</option>
                          <option value="tcp">Network (TCP/IP) Printer</option>
                          <option value="browser">Web Browser Print Dialog (PWA / Mobile / Vercel)</option>
                        </select>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Paper Size / Roll Width</label>
                        <select
                          value={config.width}
                          onChange={(e) => setConfig({ ...config, width: parseInt(e.target.value, 10) })}
                          style={styles.select}
                          required
                        >
                          <option value={36}>80mm Roll (36 Characters Width)</option>
                          <option value={32}>58mm Roll (32 Characters Width)</option>
                        </select>
                      </div>

                      {config.type === 'windows' && (
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Printer Name</label>
                          <input
                            type="text"
                            value={config.name}
                            onChange={(e) => setConfig({ ...config, name: e.target.value })}
                            placeholder="e.g. POS-80"
                            style={styles.input}
                            required
                          />
                        </div>
                      )}

                      {config.type === 'tcp' && (
                        <div style={styles.gridInput}>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>IP Address</label>
                            <input
                              type="text"
                              value={config.host}
                              onChange={(e) => setConfig({ ...config, host: e.target.value })}
                              placeholder="e.g. 192.168.1.100"
                              style={styles.input}
                              required
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Port</label>
                            <input
                              type="number"
                              value={config.port}
                              onChange={(e) => setConfig({ ...config, port: e.target.value })}
                              placeholder="9100"
                              style={styles.input}
                              required
                            />
                          </div>
                        </div>
                      )}

                      {status && (
                        <div style={styles.statusBox}>
                          <div style={styles.statusLine}>
                            <span style={styles.statusLabel}>Active Printer Path:</span>
                            <span style={styles.statusValue}>{status.printer || 'Not Detected'}</span>
                          </div>
                          <div style={styles.statusLine}>
                            <span style={styles.statusLabel}>Active Connection Type:</span>
                            <span style={{ ...styles.statusValue, textTransform: 'uppercase' }}>{status.type}</span>
                          </div>
                        </div>
                      )}

                      <button type="submit" style={styles.saveBtn} disabled={saving}>
                        <Save size={18} />
                        <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
                      </button>
                    </form>
                  ) : activeTab === 'profile' ? (
                    <form onSubmit={(e) => { e.preventDefault(); setShowSaveProfileConfirm(true); }} style={styles.form}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Store Name (Receipt Header)</label>
                        <input
                          type="text"
                          value={storeConfig.storeName}
                          onChange={(e) => setStoreConfig({ ...storeConfig, storeName: e.target.value })}
                          placeholder="e.g. Angaara Bites"
                          style={styles.input}
                          required
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Phone Number</label>
                        <input
                          type="text"
                          value={storeConfig.phone}
                          onChange={(e) => setStoreConfig({ ...storeConfig, phone: e.target.value })}
                          placeholder="e.g. +92 3342471192"
                          style={styles.input}
                          required
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Receipt Footer Note</label>
                        <input
                          type="text"
                          value={storeConfig.footerNote}
                          onChange={(e) => setStoreConfig({ ...storeConfig, footerNote: e.target.value })}
                          placeholder="e.g. Thank You! Please Visit Again."
                          style={styles.input}
                          required
                        />
                      </div>

                      <button type="submit" style={styles.saveBtn} disabled={saving}>
                        <Save size={18} />
                        <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                      </button>
                    </form>
                  ) : (
                    <div style={styles.dbContainer}>
                      <div style={styles.dbStatsGrid}>
                        <div style={styles.statCard}>
                          <span style={styles.statLabel}>Total Sales Records</span>
                          <span style={styles.statValueText}>{dbStats.totalSales}</span>
                        </div>
                        <div style={styles.statCard}>
                          <span style={styles.statLabel}>Total Expenses Records</span>
                          <span style={styles.statValueText}>{dbStats.totalExpenses}</span>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="glass-card" style={styles.sectionRowRight}>
                {activeTab === 'printer' && (
                  <>
                    <div style={styles.previewHeader}>
                      <Printer size={18} color="var(--primary-yellow)" />
                      <h3 style={styles.previewTitle}>Print Preview</h3>
                    </div>
                    <p style={styles.previewSubtitle}>View simulated print layout exactly as it will emerge from the ticket machine.</p>
                    <div style={styles.previewBtnContainer}>
                      <button onClick={() => setShowReceiptTypeModal(true)} style={styles.previewBtn}>
                        Customer Receipt
                      </button>
                      <button onClick={() => triggerPreview('KOT_DESI')} style={styles.previewBtn}>
                        KOT (Desi Kitchen)
                      </button>
                      <button onClick={() => triggerPreview('KOT_FASTFOOD')} style={styles.previewBtn}>
                        KOT (Fast Food)
                      </button>
                    </div>
                  </>
                )}

                {activeTab === 'profile' && (
                  <>
                    <div style={styles.previewHeader}>
                      <ImageIcon size={18} color="var(--primary-yellow)" />
                      <h3 style={styles.previewTitle}>Receipt Logo</h3>
                    </div>
                    <div style={{ ...styles.logoUploadContainer, flexDirection: 'column' }}>
                      <div style={{ ...styles.logoPreviewBox, width: '100%', maxWidth: '200px', margin: '0 auto', height: '140px' }}>
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Print Logo"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px' }}
                          />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.4rem', color: 'var(--text-muted)' }}>
                            <ImageIcon size={28} />
                            <span style={{ fontSize: '0.75rem' }}>No logo</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', textAlign: 'center' }}>
                          Logo appears at the top of customer receipts. Default logo is used if none uploaded.
                        </p>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileSelect}
                          style={{ display: 'none' }}
                          id="logo-file-input"
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <label
                            htmlFor="logo-file-input"
                            style={{ ...styles.logoPickBtn, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                          >
                            <ImageIcon size={15} />
                            <span>Choose File</span>
                          </label>
                          {logoFile && (
                            <button
                              type="button"
                              onClick={handleLogoUpload}
                              disabled={logoUploading}
                              style={{ ...styles.logoUploadBtn }}
                            >
                              <Upload size={15} />
                              <span>{logoUploading ? 'Uploading...' : 'Upload'}</span>
                            </button>
                          )}
                          {storeConfig.logoUrl && !logoFile && (
                            <button
                              type="button"
                              onClick={() => setShowDeleteLogoConfirm(true)}
                              disabled={logoUploading}
                              style={{ ...styles.logoUploadBtn, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                            >
                              <Trash2 size={15} />
                              <span>{logoUploading ? 'Removing...' : 'Remove Logo'}</span>
                            </button>
                          )}
                        </div>
                        {logoFile && (
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--primary-yellow)', textAlign: 'center' }}>
                            Selected: {logoFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'database' && (
                  <>
                    <div style={styles.previewHeader}>
                      <AlertCircle size={18} color="var(--accent-red)" />
                      <h3 style={styles.previewTitle}>Danger Zone</h3>
                    </div>
                    <div style={styles.infoAlert}>
                      <Info size={20} color="var(--primary-yellow)" style={{ flexShrink: 0 }} />
                      <p style={styles.infoText}>
                        Resetting database tables is permanent. Ensure backups are exported before proceeding.
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowResetSelectModal(true)} 
                      style={{ ...styles.resetBtn, width: '100%', marginTop: '0.5rem' }}
                      disabled={saving}
                    >
                      <Trash2 size={18} />
                      <span>Reset Database Records</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showSaveProfileConfirm && (
        <ConfirmModal
          isOpen={showSaveProfileConfirm}
          title="Save Store Profile"
          message={`Are you sure you want to save the store profile? Store Name "${storeConfig.storeName}" will be updated. These changes will immediately apply to all new printouts.`}
          onConfirm={handleSaveStore}
          onClose={() => setShowSaveProfileConfirm(false)}
          confirmText="Save"
          cancelText="Cancel"
        />
      )}

      {showDeleteLogoConfirm && (
        <ConfirmModal
          isOpen={showDeleteLogoConfirm}
          title="Remove Custom Logo"
          message="Are you sure you want to permanently remove the custom logo? The default logo will be used instead."
          onConfirm={handleLogoDelete}
          onClose={() => setShowDeleteLogoConfirm(false)}
          confirmText="Remove"
          cancelText="Cancel"
        />
      )}

      {showResetSelectModal && (
        <ResetSelectionModal
          isOpen={showResetSelectModal}
          onClose={() => setShowResetSelectModal(false)}
          onNext={() => {
            setShowResetSelectModal(false);
            setShowPasswordModal(true);
          }}
          resetType={resetType}
          setResetType={setResetType}
        />
      )}

      {showPasswordModal && (
        <VerifyPasswordModal
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            setPassword('');
          }}
          onConfirm={handleResetDatabase}
          password={password}
          setPassword={setPassword}
          saving={saving}
        />
      )}

      {showPreviewModal && (
        <PrintPreviewModal
          isOpen={showPreviewModal}
          onClose={() => { setShowPreviewModal(false); setPreviewLines(null); }}
          title={previewTitle}
          lines={previewLines}
          W={previewWidth}
          logoUrl={storeConfig.logoUrl}
        />
      )}

      {showReceiptTypeModal && (
        <ReceiptTypeModal
          isOpen={showReceiptTypeModal}
          onClose={() => setShowReceiptTypeModal(false)}
          onSelect={(type) => {
            setShowReceiptTypeModal(false);
            triggerPreview(type);
          }}
        />
      )}
    </Layout>
  );
};

const ReceiptTypeModal = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;
  return createPortal(
    <div style={styles.modalOverlay}>
      <div className="modal-card" style={styles.receiptModal}>
        <div style={styles.receiptModalHeader}>
          <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>Select Receipt Type</h3>
          <button onClick={onClose} style={styles.closeBtn}>&times;</button>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
            Choose which type of customer receipt you want to preview:
          </p>
          <button 
            onClick={() => onSelect('CUSTOMER_RECEIPT_SIMPLE')}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            Simple Receipt (Dine-in / Takeaway)
          </button>
          <button 
            onClick={() => onSelect('CUSTOMER_RECEIPT_DELIVERY')}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            Delivery Receipt (Includes Customer Details)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const PrintPreviewModal = ({ isOpen, onClose, title, lines, W = 36, logoUrl }) => {
  if (!isOpen || !lines) return null;

  return createPortal(
    <div style={styles.modalOverlay}>
      <div className="modal-card" style={styles.receiptModal}>
        <div style={styles.receiptModalHeader}>
          <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>{title}</h3>
          <button onClick={onClose} style={styles.closeBtn}>&times;</button>
        </div>
        <div style={{ ...styles.receiptPaperWrapper, flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ ...styles.receiptPaper, width: W === 32 ? '280px' : '320px' }}>
            {title && title.includes('Customer Receipt') && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <img 
                  src={logoUrl || printLogoImg} 
                  alt="Angaara Logo" 
                  style={{ 
                    maxWidth: '120px', 
                    height: 'auto', 
                    maxHeight: '80px',
                    objectFit: 'contain'
                  }} 
                />
              </div>
            )}
            {lines.map((line, idx) => {
              let text = line;
              let isBig = false;
              let isBold = false;
              let isRight = false;
              let isCenter = false;

              while (true) {
                if (text.startsWith('!!BIG!!')) {
                  isBig = true;
                  text = text.slice(7);
                } else if (text.startsWith('!!BOLD!!')) {
                  isBold = true;
                  text = text.slice(8);
                } else if (text.startsWith('!!RIGHT!!')) {
                  isRight = true;
                  text = text.slice(9);
                } else if (text.startsWith('!!CENTER!!')) {
                  isCenter = true;
                  text = text.slice(10);
                } else {
                  break;
                }
              }

              return (
                <div 
                  key={idx} 
                  style={{
                    fontSize: isBig ? '1.25em' : '1em',
                    fontWeight: (isBig || isBold) ? '800' : '500',
                    textAlign: isCenter ? 'center' : (isRight ? 'right' : 'left'),
                    fontFamily: "'Courier New', Courier, monospace",
                    whiteSpace: 'pre-wrap',
                    minHeight: '1.2em',
                    lineHeight: '1.3',
                    color: '#000'
                  }}
                >
                  {isCenter ? text.trim() : text || ' '}
                </div>
              );
            })}
          </div>
        </div>
        <div style={styles.receiptModalFooter}>
          <button onClick={onClose} style={styles.closeBtnOk}>Close Preview</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ResetSelectionModal = ({ isOpen, onClose, onNext, resetType, setResetType }) => {
  if (!isOpen) return null;
  return createPortal(
    <div style={styles.modalOverlay}>
      <div className="modal-card" style={styles.receiptModal}>
        <div style={styles.receiptModalHeader}>
          <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>Reset Database Records</h3>
          <button onClick={onClose} style={styles.closeBtn}>&times;</button>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Select the records you want to permanently clear from the database:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { id: 'sales', title: 'Reset Sales History', desc: 'Clear all historical sales data and invoices.' },
              { id: 'expenses', title: 'Reset Expenses Records', desc: 'Clear all recorded expenses and payouts.' },
              { id: 'both', title: 'Reset Both (Sales & Expenses)', desc: 'Completely wipe all transactional database records.' }
            ].map((option) => (
              <label 
                key={option.id}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '1rem',
                  borderRadius: '10px',
                  border: `1px solid ${resetType === option.id ? 'var(--primary-yellow)' : 'var(--glass-border)'}`,
                  backgroundColor: resetType === option.id ? 'rgba(250, 204, 21, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer', 
                  transition: 'all 0.25s ease'
                }}
              >
                <input 
                  type="radio" 
                  name="resetType" 
                  value={option.id} 
                  checked={resetType === option.id} 
                  onChange={() => setResetType(option.id)} 
                  style={{ cursor: 'pointer', accentColor: 'var(--primary-yellow)', width: '18px', height: '18px', margin: 0 }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: resetType === option.id ? 'var(--primary-yellow)' : 'var(--text-main)', fontSize: '0.95rem', fontWeight: resetType === option.id ? '700' : '600' }}>
                    {option.title}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {option.desc}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div style={{ ...styles.receiptModalFooter, gap: '10px' }}>
          <button 
            onClick={onClose} 
            style={{ 
              ...styles.closeBtnOk, 
              backgroundColor: 'rgba(255, 255, 255, 0.05)', 
              color: 'var(--text-main)', 
              border: '1px solid var(--glass-border)' 
            }}
          >
            Cancel
          </button>
          <button 
            onClick={onNext} 
            style={styles.closeBtnOk}
          >
            Next
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const VerifyPasswordModal = ({ isOpen, onClose, onConfirm, password, setPassword, saving }) => {
  if (!isOpen) return null;
  return createPortal(
    <div style={styles.modalOverlay}>
      <form onSubmit={onConfirm} className="modal-card" style={styles.receiptModal}>
        <div style={styles.receiptModalHeader}>
          <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>Enter Admin Password</h3>
          <button type="button" onClick={onClose} style={styles.closeBtn}>&times;</button>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Type your administrator password to confirm database records reset. This action cannot be undone.
          </p>
          <input 
            type="password" 
            placeholder="Enter admin password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-main)',
              fontSize: '1rem',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box'
            }}
            required 
            autoFocus
          />
        </div>
        <div style={{ ...styles.receiptModalFooter, gap: '10px' }}>
          <button 
            type="button"
            onClick={onClose} 
            style={{ 
              ...styles.closeBtnOk, 
              backgroundColor: 'rgba(255, 255, 255, 0.05)', 
              color: 'var(--text-main)', 
              border: '1px solid var(--glass-border)' 
            }}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={saving || !password}
            style={{ 
              ...styles.closeBtnOk, 
              backgroundColor: 'var(--accent-red)', 
              color: '#fff', 
              border: 'none', 
              fontWeight: '700' 
            }}
          >
            {saving ? 'Resetting...' : 'Confirm Reset'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    width: '100%',
    maxWidth: '1060px',
    margin: '0 auto',
    padding: '0.1rem 0'
  },
  headerRow: {
    width: '100%',
    padding: '0.6rem 1rem',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.15rem',
    fontWeight: '800',
    color: 'var(--text-main)'
  },
  headerSubtitle: {
    margin: '0.1rem 0 0 0',
    fontSize: '0.75rem',
    color: 'var(--text-muted)'
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.4rem',
    borderRadius: '6px',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  gridRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.6rem',
    width: '100%',
  },
  gridItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0.8rem',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.25s ease'
  },
  gridTextContainer: {
    display: 'flex',
    flexDirection: 'column'
  },
  gridTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
  },
  gridSubtitle: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    marginTop: '0.05rem'
  },
  sectionRowContainer: {
    display: 'flex',
    gap: '1rem',
    width: '100%',
    alignItems: 'stretch'
  },
  sectionRowLeft: {
    flex: 1,
    padding: '1.25rem 1.5rem',
    minHeight: '220px'
  },
  sectionRowRight: {
    width: '36.3%',
    minWidth: '320px',
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    justifyContent: 'flex-start'
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '0.5rem'
  },
  previewTitle: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: '800',
    color: 'var(--text-main)'
  },
  previewSubtitle: {
    margin: 0,
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    lineHeight: '1.4'
  },
  previewBtnContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: '0.25rem'
  },
  previewBtn: {
    padding: '0.6rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-main)',
    fontSize: '0.85rem',
    fontWeight: '700',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'block',
    width: '100%'
  },
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
    zIndex: 1100
  },
  receiptModal: {
    width: '90%',
    maxWidth: '440px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    border: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    margin: '0 auto'
  },
  receiptModalHeader: {
    padding: '1rem 1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--glass-border)'
  },
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: 0,
    lineHeight: '1'
  },
  receiptPaperWrapper: {
    padding: '1rem',
    backgroundColor: 'rgba(0,0,0,0.15)',
    display: 'flex',
    justifyContent: 'center'
  },
  receiptPaper: {
    backgroundColor: '#ffffff',
    color: '#000000',
    padding: '1rem 0.75rem',
    borderRadius: '2px',
    border: '1px solid #e0e0e0',
    fontFamily: "'Courier New', Courier, monospace",
    lineHeight: '1.4',
    maxHeight: '440px',
    overflowY: 'auto',
    overflowX: 'hidden',
    width: '320px',
    fontSize: '13px',
    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)',
    margin: '0 auto'
  },
  receiptModalFooter: {
    padding: '0.75rem 1rem',
    display: 'flex',
    justifyContent: 'center',
    borderTop: '1px solid var(--glass-border)',
    backgroundColor: 'rgba(0,0,0,0.05)'
  },
  closeBtnOk: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'var(--primary-yellow)',
    color: '#000',
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer'
  },
  spinnerContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '150px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    maxWidth: '500px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-muted)'
  },
  select: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-main)',
    fontSize: '0.9rem'
  },
  input: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-main)',
    fontSize: '0.9rem'
  },
  gridInput: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '0.75rem'
  },
  statusBox: {
    padding: '0.5rem 0.75rem',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    marginTop: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem'
  },
  statusLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)'
  },
  statusValue: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-main)'
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'var(--primary-yellow)',
    color: '#000',
    border: 'none',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '0.25rem',
    transition: 'opacity 0.2s ease',
    width: 'fit-content'
  },
  notification: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid',
    marginBottom: '1rem',
    maxWidth: '500px'
  },
  dbContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    maxWidth: '500px'
  },
  dbStatsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem'
  },
  statCard: {
    padding: '0.6rem 0.8rem',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem'
  },
  statLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)'
  },
  statValueText: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: 'var(--primary-yellow)'
  },
  infoAlert: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(250, 204, 21, 0.04)',
    border: '1px solid rgba(250, 204, 21, 0.15)'
  },
  infoText: {
    margin: 0,
    fontSize: '0.8rem',
    lineHeight: '1.35',
    color: 'var(--text-muted)'
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    color: 'var(--accent-red)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    width: 'fit-content'
  }
};

export default Settings;
