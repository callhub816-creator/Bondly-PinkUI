import React from 'react';
console.log('%c BONDLY AI: Protected Connection Active ', 'background: #4A2040; color: #FF9ACB; font-size: 14px; font-weight: bold; padding: 4px; border-radius: 4px;');
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for background call handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('ServiceWorker registration failed:', err);
    });
  });
}