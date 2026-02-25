import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('OpenHR PWA ServiceWorker registered. Scope:', registration.scope);
      })
      .catch(error => {
        console.warn('OpenHR PWA ServiceWorker registration failed:', error);
      });
  });
}

// NOTE: beforeinstallprompt and appinstalled listeners are in index.html (inline script)
// to avoid race conditions with ESM module loading on slower devices.

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