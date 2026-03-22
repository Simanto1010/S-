import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

console.log('[Kernel] S+ System Boot Sequence Initiated');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const root = createRoot(rootElement);
  
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
  
  // Register Service Worker with update handling
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        console.log('[PWA] Service Worker registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, but waiting for all tabs to close
                console.log('[PWA] New content available, waiting for user to update');
                window.dispatchEvent(new CustomEvent('sw-update-available'));
              }
            });
          }
        });
      }).catch(error => {
        console.error('[PWA] Service Worker registration failed:', error);
      });
    });
  }
  
  console.log('[Kernel] UI Mount Successful');
} catch (error) {
  console.error('[Kernel] Critical Boot Failure:', error);
  // The global window.onerror in index.html will handle displaying the crash screen
}
