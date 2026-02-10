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

// Listen for the "Install PWA" event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the default mini-infobar from appearing on some mobile browsers
  e.preventDefault();

  // Custom property to make it accessible to components
  (window as any).deferredPWAPrompt = e;
  
  // Notify components that the app is now installable
  window.dispatchEvent(new CustomEvent('pwa-install-available'));
  
  console.log('PWA: Ready for manual installation trigger');
});

window.addEventListener('appinstalled', () => {
  console.log('PWA: Successfully installed on device');
  (window as any).deferredPWAPrompt = null;
  window.dispatchEvent(new CustomEvent('pwa-installed'));
});

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