import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Terminal, RefreshCw, Trash2, Search, CheckCircle, Copy } from 'lucide-react';
import { Spinner } from '../ui/spinner-1';
import ConfirmModal from '../ConfirmModal';


const LogsConsole = ({ setGlobalNotification }) => {
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPages, setLogsPages] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsFilterLevel, setLogsFilterLevel] = useState('all');
  const [logsSearch, setLogsSearch] = useState('');
  const [logsFilterDate, setLogsFilterDate] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (log) => {
    const textToCopy = log.message + (log.stack ? '\n' + log.stack : '');
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopiedId(log._id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(err => console.error(err));
  };

  const fetchLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const res = await api.get('/api/logs', {
        params: {
          page,
          limit: 10,
          level: logsFilterLevel,
          search: logsSearch,
          date: logsFilterDate
        }
      });
      setLogs(res.data.logs);
      setLogsPage(res.data.pagination.page);
      setLogsPages(res.data.pagination.pages);
      setLogsTotal(res.data.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleClearLogs = async () => {
    setLogsLoading(true);
    setShowClearConfirm(false);
    try {
      await api.delete('/api/logs');
      setGlobalNotification({ type: 'success', message: 'All system logs cleared successfully.' });
      setLogs([]);
      setLogsPage(1);
      setLogsPages(1);
      setLogsTotal(0);
    } catch (err) {
      console.error(err);
      setGlobalNotification({ type: 'error', message: 'Failed to clear system logs.' });
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(logsPage);
  }, [logsPage, logsFilterLevel, logsFilterDate]);

  return (
    <div className="glass-card" style={{ flex: 1, padding: '1.25rem 1.5rem', minHeight: '280px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Terminal size={18} color="var(--primary-yellow)" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)' }}>System Logs Console</h3>
          <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>
            Total: {logsTotal}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            onClick={() => fetchLogs(1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.35rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--glass-border)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              gap: '0.25rem',
              fontWeight: '600'
            }}
            disabled={logsLoading}
          >
            <RefreshCw size={12} className={logsLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button 
            onClick={() => setShowClearConfirm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.35rem 0.6rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              color: 'var(--accent-red)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
            disabled={logsLoading}
          >
            <Trash2 size={12} />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>Date:</span>
          <input
            type="date"
            value={logsFilterDate}
            onChange={(e) => { setLogsFilterDate(e.target.value); setLogsPage(1); }}
            style={{
              padding: '0.2rem 0.4rem',
              fontSize: '0.8rem',
              borderRadius: '6px',
              backgroundColor: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-main)',
              colorScheme: 'dark'
            }}
          />
          {logsFilterDate && (
            <button
              onClick={() => { setLogsFilterDate(''); setLogsPage(1); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-red)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '2px'
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>Level:</span>
          <select
            value={logsFilterLevel}
            onChange={(e) => { setLogsFilterLevel(e.target.value); setLogsPage(1); }}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.8rem',
              borderRadius: '6px',
              backgroundColor: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-main)'
            }}
          >
            <option value="all">All Levels</option>
            <option value="error">Errors Only</option>
            <option value="warn">Warnings Only</option>
          </select>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setLogsPage(1); fetchLogs(1); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: '200px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>Search:</span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
            <Search size={12} style={{ position: 'absolute', left: '0.5rem', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search messages..."
              value={logsSearch}
              onChange={(e) => setLogsSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.25rem 0.5rem 0.25rem 1.6rem',
                fontSize: '0.8rem',
                borderRadius: '6px',
                backgroundColor: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-main)'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.25rem 0.6rem',
              fontSize: '0.75rem',
              borderRadius: '6px',
              backgroundColor: 'var(--primary-yellow)',
              color: '#000',
              border: 'none',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1, maxHeight: '220px', minHeight: '120px', paddingRight: '0.25rem' }}>
        {logsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: '150px' }}>
            <Spinner />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', gap: '0.5rem', minHeight: '150px' }}>
            <CheckCircle size={32} color="var(--primary-yellow)" />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>No system logs found.</p>
          </div>
        ) : (
          logs.map(log => {
            const isError = log.level === 'error';
            return (
              <div
                key={log._id}
                style={{
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  backgroundColor: isError ? 'rgba(239, 68, 68, 0.02)' : 'rgba(250, 204, 21, 0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    color: isError ? '#ef4444' : '#facc15',
                    backgroundColor: isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(250, 204, 21, 0.1)',
                    border: `1px solid ${isError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(250, 204, 21, 0.2)'}`
                  }}>
                    {log.level}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleString('en-PK')}
                    </span>
                    <button
                      onClick={() => handleCopy(log)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: copiedId === log._id ? 'var(--primary-yellow)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'color 0.2s'
                      }}
                      title="Copy log text"
                    >
                      {copiedId === log._id ? <CheckCircle size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', wordBreak: 'break-all', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {log.message}
                </p>
                {log.stack && (
                  <details style={{ marginTop: '0.25rem' }}>
                    <summary style={{ fontSize: '0.7rem', color: 'var(--primary-yellow)', cursor: 'pointer', outline: 'none', fontWeight: '700' }}>
                      View Stack Trace
                    </summary>
                    <pre style={{
                      margin: '0.35rem 0 0 0',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--glass-border)',
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.7)',
                      fontFamily: 'monospace',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '150px'
                    }}>
                      {log.stack}
                    </pre>
                  </details>
                )}
              </div>
            );
          })
        )}
      </div>

      {logsPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', marginTop: 'auto' }}>
          <button
            onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
            disabled={logsPage === 1 || logsLoading}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-main)'
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
            Page {logsPage} of {logsPages}
          </span>
          <button
            onClick={() => setLogsPage(prev => Math.min(logsPages, prev + 1))}
            disabled={logsPage === logsPages || logsLoading}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-main)'
            }}
          >
            Next
          </button>
        </div>
      )}

      {showClearConfirm && (
        <ConfirmModal
          isOpen={showClearConfirm}
          title="Clear System Logs"
          message="Are you sure you want to permanently clear all system console logs? This cannot be undone."
          onConfirm={handleClearLogs}
          onClose={() => setShowClearConfirm(false)}
          confirmText="Clear All"
          cancelText="Cancel"
        />
      )}
    </div>
  );
};

export default LogsConsole;
