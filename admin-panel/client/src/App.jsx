import React, { Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Items from './pages/Items';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Deals from './pages/Deals';
import Sales from './pages/Sales';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';

import { Agentation } from 'agentation';
import { DataProvider } from './context/DataContext';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    const errorText = error.toString().toLowerCase();
    const isChunkError = errorText.includes('chunk') || 
                         errorText.includes('failed to fetch') ||
                         errorText.includes('loading chunk') ||
                         errorText.includes('dynamically imported');

    if (isChunkError) {
      console.warn("Chunk load error detected! Triggering auto-reload...");
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0a0a0a', color: '#ffffff', padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: 'var(--primary-yellow)', marginBottom: '1rem', fontWeight: '800' }}>System Update / Error</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '400px', fontSize: '0.9rem', lineHeight: '1.5' }}>
            The application has updated or encountered a loading error. Please reload to load the latest version.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary" 
            style={{ padding: '0.8rem 1.5rem', fontWeight: 'bold' }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Simple Protected Route
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <DataProvider>
        <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/categories" 
            element={
              <ProtectedRoute>
                <Categories />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/items" 
            element={
              <ProtectedRoute>
                <Items />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inventory" 
            element={
              <ProtectedRoute>
                <Inventory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/pos" 
            element={
              <ProtectedRoute>
                <POS />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/deals" 
            element={
              <ProtectedRoute>
                <Deals />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/sales" 
            element={
              <ProtectedRoute>
                <Sales />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/expenses" 
            element={
              <ProtectedRoute>
                <Expenses />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } 
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        {import.meta.env.MODE === 'development' && (
          <Agentation 
            endpoint="http://localhost:4747"
            onSessionCreated={(sessionId) => {
              console.log("Session started:", sessionId);
            }}
          />
        )}
      </Router>
    </DataProvider>
    </ErrorBoundary>
  );
}

export default App;
