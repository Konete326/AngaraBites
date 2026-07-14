import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Sun, Moon, Menu, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';

const Layout = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { dataError, refreshData } = useData() || {};
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1100);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1100);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1100;
      setIsMobile(mobile);
      if (mobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  if (dataError) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        color: '#fff'
      }}>
        <div className="glass-card" style={{
          maxWidth: '460px',
          width: '100%',
          padding: '2.5rem',
          borderRadius: '16px',
          textAlign: 'center',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.5M5 12.5a10.94 10.94 0 0 1 5.83-2.84M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>
            </svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.75rem', color: '#ef4444' }}>Server Offline</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '2rem' }}>
            Unable to connect to the backend server. Please check if the server is running on your system and try again.
          </p>
          <button 
            onClick={refreshData}
            className="btn-primary"
            style={{ width: '100%', padding: '0.8rem', fontWeight: 'bold' }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const pageTitles = {
    '/dashboard': 'Dashboard Overview',
    '/pos': 'Point of Sale',
    '/sales': 'Sales Record',
    '/deals': 'Deals Management',
    '/categories': 'Categories',
    '/items': 'Items Inventory',
    '/settings': 'Settings'
  };

  const title = pageTitles[location.pathname] || 'Admin Panel';


  return (
    <div style={styles.container}>
      {isSidebarOpen && isMobile && <div className="overlay" onClick={() => setIsSidebarOpen(false)} />}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="layout-main" style={{ ...styles.main, marginLeft: isSidebarOpen && !isMobile ? '280px' : '0' }}>
        <header className="responsive-header sticky-header" style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              className="sidebar-toggle-btn" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={styles.menuBtn}
            >
              <Menu size={24} />
            </button>
            <div className="page-header">
              <h1 style={styles.pageTitle}>{title}</h1>
              <p style={styles.pageSubtitle}>Management Console</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button onClick={() => navigate('/settings')} className="header-toggle">
              <Settings size={24} />
            </button>
            <button onClick={toggleTheme} className="header-toggle">
              {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
            </button>
          </div>

        </header>

        <div style={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-main)',
  },
  main: {
    flex: 1,
    marginLeft: '280px',
    padding: '1rem 2rem',
    transition: 'margin-left 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
    minWidth: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuBtn: {
    display: 'flex',
    backgroundColor: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    padding: '0.4rem',
    borderRadius: '10px',
    color: 'var(--text-main)',
  },
  pageTitle: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: 'var(--text-main)',
    lineHeight: 1.1,
  },
  pageSubtitle: {
    color: 'var(--text-muted)',
    marginTop: '0.1rem',
    fontSize: '0.8rem',
  },
  content: {
    width: '100%',
    minWidth: 0,
  }
};

export default Layout;
