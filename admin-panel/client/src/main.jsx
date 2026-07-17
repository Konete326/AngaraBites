import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import { initLogger } from './utils/logger'

initLogger();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        if (import.meta.env.DEV) {
          console.log('Service Worker registered successfully:', reg.scope);
        }
      })
      .catch(err => {
        // Suppress expected errors during search engine crawling (Googlebot WRS) or restricted browsing modes (e.g. Incognito)
        const isExpectedRejection = 
          err && 
          (err.message === 'Rejected' || 
           err.name === 'SecurityError' || 
           err.message?.includes('SecurityError') || 
           err.message?.includes('Rejected') ||
           navigator.userAgent.includes('Googlebot') ||
           navigator.userAgent.includes('WRS'));

        if (isExpectedRejection) {
          if (import.meta.env.DEV) {
            console.warn('Service Worker registration was rejected or blocked (expected in crawls/incognito):', err);
          }
        } else {
          console.error('Service Worker registration failed:', err);
        }
      });
  });
}

