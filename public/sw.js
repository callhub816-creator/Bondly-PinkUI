// public/sw.js
const VERSION = 'v1';
const CALL_STATE_KEY = 'call-session-state';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

let callData = {
    startTime: null,
    isActive: false,
    personaId: null
};

self.addEventListener('message', (event) => {
    const data = event.data;

    if (data.type === 'START_CALL') {
        callData = {
            startTime: Date.now(),
            isActive: true,
            personaId: data.personaId
        };
    } else if (data.type === 'END_CALL') {
        callData = {
            startTime: null,
            isActive: false,
            personaId: null
        };
    } else if (data.type === 'GET_CALL_STATUS') {
        event.source.postMessage({
            type: 'CALL_STATUS',
            ...callData,
            currentTime: Date.now()
        });
    }
});

// Periodic keep-alive or background task if needed
// (Service Workers are limited, but we can store state here)
