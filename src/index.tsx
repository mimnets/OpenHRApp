import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// NOTE: Service worker registration, beforeinstallprompt, and appinstalled listeners
// are all in index.html (inline script) to avoid race conditions with ESM module loading.

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err) {
  console.error("React Render Crash:", err);
  if (window.onerror) {
    window.onerror(String(err), "index.tsx", 0, 0, err as Error);
  }
}