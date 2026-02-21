// Background Call Service Worker

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installed');
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/call')) {
    console.log('[Service Worker] Intercepting call request:', event.request.url);
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response('Call handling in background');
      })
    );
  }
});