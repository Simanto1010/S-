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
  
  console.log('[Kernel] UI Mount Successful');
} catch (error) {
  console.error('[Kernel] Critical Boot Failure:', error);
  // The global window.onerror in index.html will handle displaying the crash screen
}
